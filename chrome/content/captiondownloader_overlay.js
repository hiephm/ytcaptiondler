// ALL RIGHTS RESERVED Written by Ho Minh Hiep 

var ytcaptiondler = {
	ESCAPE_SEQ : new Array(/&quot;/g,/&amp;/g,/&lt;/g,/&gt;/g,/&#39;/g),
	UNESCAPE_SEQ : new Array("\"","&","<",">","'"),


  onLoad: function() {
		window.document.addEventListener("DOMContentLoaded", ytcaptiondler.DownloadCaption, true);
  },

	DownloadCaption : function(event) {
	   
		var doc = event.originalTarget;
		var loc = doc.location;			
		var u = doc.location.toString();
		if (loc.href.match(/http:\/\/www(|[0-9])\.(|l\.)youtube\..*\/.*/i)) {
			doc.videoID = ytcaptiondler.getQuery(doc, "v");
			var watchCaptions = doc.getElementById("watch-transcript");
			if(doc.videoID != null && watchCaptions != null) {
				ytcaptiondler.addCaptionDownloadLinks(doc);
			}
		}
	},

	getQueryString : function (href, ji) {
		var gy = href.split("&");
		for (var i=0;i<gy.length;i++) {
			var ft = gy[i].split("=");
			if (ft[0] == ji) {
				return ft[1];
			}
		}
	},
	getQuery : function(doc, param) {
		var query = ytcaptiondler.getQueryString(doc.location.search.substring(1), param);	

		if ((query=="") || (query==null)) {
			query = ytcaptiondler.getQueryString(doc.location.hash, param);	
		}	
		return query;
	},
	
	addCaptionDownloadLinks : function(doc) {
		var downloadLinks	= doc.getElementById("caption-download");
		if (downloadLinks==null) {
			doc.videoTitle   = doc.title.replace(/ - YouTube/gi, "");
			var downloadLinks = doc.createElement("div");
			downloadLinks.setAttribute("id", "caption-download");
			downloadLinks.style.cssFloat = "right";
			downloadLinks.style.paddingRight="22px;";

			downloadLinks.appendChild(ytcaptiondler.setLanguageChoice(doc));
			downloadLinks.appendChild(ytcaptiondler.setCaptionDownloadButton(doc));
			
			var watchViewsDiv	= doc.getElementById("watch-actions");
			watchViewsDiv.appendChild(downloadLinks);
		}		
	},
	setLanguageChoice : function(doc) {
		var select = doc.createElement("select");
		select.setAttribute("id", "caption-language-select");
		select.style.width = "100px";
		var trackUrl = ytcaptiondler.getTrackURL(doc.videoID);
		
		ytcaptiondler.doXHR(trackUrl, function(text) {
			var myRe = /<track [^<]*name="([^<]*)" [^<]*lang_code="([a-z]+)" [^<]*lang_translated="([a-zA-Z]+)"/g;
			var myArray;
			var content = "";
			var count = 1;
			
			while ((myArray = myRe.exec(text)) != null) {
				var option = doc.createElement("option");
				option.innerHTML = myArray[3] + ((myArray[1] != "") ? " - " + myArray[1] : "");
				option.value = myArray[2] + "," + myArray[1];
				if(count == 1) {
					option.selected = "selected";
				}
				count++;
				select.appendChild(option);
			}
		});
		
		return select;
	},
	
	setCaptionDownloadButton : function(doc) {
		var button = doc.createElement("button");
		button.className = "yt-uix-tooltip-reverse yt-uix-button yt-uix-tooltip yt-uix-button-empty";
		button.title = "Download close caption";
		button.style.marginLeft = "4px";
		
		var img = doc.createElement("div");
		img.style.backgroundImage = "url(chrome://ytcaptiondler/content/icons/icon_small.png)";
		img.style.backgroundRepeat = "no-repeat";
		img.style.width = "23px";
		img.style.height = "17px";
		
		button.appendChild(img);
		
		button.addEventListener("click",function(e) {
			var langCode = "en";
			var langName = "";
			var languageChoice = doc.getElementById("caption-language-select");
			if(languageChoice != null) {
				var value = languageChoice.options[languageChoice.selectedIndex].value;
				if(value != "" || value != null) {
					value = value.split(",");
					langCode = value[0];
					langName = value[1];
				}
			}
			var url  = ytcaptiondler.getCaptionFileURL(doc.videoID, langCode, langName);
			ytcaptiondler.downloadCaptionFile(doc.videoTitle + "." + langCode, url ,"srt");
		},false);

		return button;
	},
	
	getCaptionFileToDownload : function(fileName, fileType) {
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, "Save As", nsIFilePicker.modeSave);
		fp.defaultString = fileName;
		fp.appendFilter(fileType, "*." + fileType);
		var rv = fp.show();
		if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
		  var file = fp.file;
		  var path = fp.file.path;
		  return file;
		}
		return null;
	},
	
	fillZero : function (num, len) {
		var result = "" + num;
		for (var i = result.length; i < len; i++) {
			result = "0" + result;
		}
		return result;
	},
	
	formatTime : function(timeInMiliSec) {
		timeInMiliSec = Math.floor(timeInMiliSec * 1000);
		var SSS = timeInMiliSec % 1000;
		timeInMiliSec = Math.floor(timeInMiliSec / 1000);
		var hh = Math.floor(timeInMiliSec / 3600);
		var mm = Math.floor((timeInMiliSec - (hh * 3600)) / 60);
		var ss = timeInMiliSec - (hh * 3600) - (mm * 60);
		return ytcaptiondler.fillZero(hh,2) + ":" 
			 + ytcaptiondler.fillZero(mm,2) + ":" 
			 + ytcaptiondler.fillZero(ss,2) + "," 
			 + ytcaptiondler.fillZero(SSS,3);
	},
	
	unescapeHTML : function(inputText)  {
		for(var i in ytcaptiondler.ESCAPE_SEQ) {
			inputText = inputText.replace(ytcaptiondler.ESCAPE_SEQ[i], ytcaptiondler.UNESCAPE_SEQ[i]);
		}
		return inputText;
	},
	
	downloadCaptionFile : function(title, url, fileType) {
		var fileName = title +"."+fileType;
		var file    = ytcaptiondler.getCaptionFileToDownload(fileName, fileType);

		ytcaptiondler.doXHR(url, function(text) {
			// file is nsIFile, data is a string
			var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
									 createInstance(Components.interfaces.nsIFileOutputStream);

			// use 0x02 | 0x10 to open file for appending.
			foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); 
			// write, create, truncate
			// In a c file operation, we have no need to set file mode with or operation,
			// directly using "r" or "w" usually.

			// if you are sure there will never ever be any non-ascii text in data you can 
			// also call foStream.writeData directly
			var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
									  createInstance(Components.interfaces.nsIConverterOutputStream);
			converter.init(foStream, "UTF-8", 0, 0);

			//var myRe = /"text": "((?:\\"|[^"])+)", "dur_ms": (\d+), "start_ms": (\d+)/g;
			//New youtube caption format:
			var myRe = /<text start="([\d\.]+)" dur="([\d\.]+)">([^<]*)/g;
			var myArray;
			var content = "";
			var count = 1;
			
			while ((myArray = myRe.exec(text)) != null)
			{
				content += count + "\n";
				content += ytcaptiondler.formatTime(parseFloat(myArray[1])) + 
						" --> " + 
						ytcaptiondler.formatTime(parseFloat(myArray[1]) + parseFloat(myArray[2])) + "\n";
				myArray[3] = myArray[3].replace(/\\n/g, "\n");
				myArray[3] = myArray[3].replace(/\\"/g, "\"");
				myArray[3] = ytcaptiondler.unescapeHTML(myArray[3]);
				content += myArray[3] + "\n\n";
				count++;
			}
			converter.writeString(content);
			
			converter.close(); // this closes foStream			
		});
	},
	
	doXHR : function(url, callback) {
		var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);  
		req.open('GET', url, true);
		req.onreadystatechange = function (aEvt) {  
			if (req.readyState == 4) {  
				if(req.status == 200) {
					callback(req.responseText);
				} else {
					alert("Error loading page\n");
				}
			}
		};
		req.send(null);
	},
	
	getCaptionFileURL : function(videoID, langCode, langName) {
		//return "http://youtube.com/watch_ajax?action_get_caption_track_all&v=" + videoID;
		//New youtube url for caption:
		return "http://www.youtube.com/api/timedtext?v=" + videoID + "&lang=" + langCode + 
				((langName != "") ? "&name=" + langName : "");
	},
	
	getTrackURL : function(videoID) {
		return "http://www.youtube.com/api/timedtext?type=list&v=" + videoID;
	}
};

window.addEventListener("load", ytcaptiondler.onLoad, false);
