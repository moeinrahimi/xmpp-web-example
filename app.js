var XMPP = require('stanza.io');
var Jingle = require('jingle');
var attachMediaStream = require('attachmediastream');
var client;
var localMedia = require('localMedia');
var localMedia = new localMedia()
localMedia.on('localStream', function (stream) {
  console.log('localstream')
    attachMediaStream(stream, document.getElementById('localVideo'), {
        mirror: true,
        muted: true
    });
  });
var loginInfo = document.getElementById('loginInfo');
var inlog = console.log.bind(console, '<<in');
var outlog = console.log.bind(console, 'out>>');;
loginInfo.onsubmit = function (e) {
  if (e.preventDefault) e.preventDefault();
  var jid = document.getElementById('jid').value;
  var username = jid.slice(0, jid.indexOf('@'));
  var server = jid.slice(jid.indexOf('@') + 1);
  var url = document.getElementById('url').value;
  var wsURL, boshURL, transport;
  if (url.indexOf('http') === 0) {
      boshURL = url;
      transport = 'bosh';
  } else if (url.indexOf('ws') === 0) {
      wsURL = url;
      transport = 'websocket';
  }
  var jingle = new Jingle();

  client = XMPP.createClient({
    jid: jid,
    password: document.getElementById('password').value,
    wsURL: wsURL,
    boshURL: boshURL,
    transport: transport
  });
  client.jingle.config.debug = true;


  client.on('session:started', function () {
    client.getRoster(function (err, resp) {
      client.sendPresence();
    });
    document.getElementById('myJID').textContent = client.jid.full;
  });
  client.on('jingle:remotestream:added', function (session, stream) {
    console.log(stream,'ssss')
    var video = document.querySelector('#remoteVideo');
    video.srcObject = stream;
});
client.on('jingle:incoming', function (session) {
  console.log(session , 'aaaaaaaa')
  // session.pc.addStream(localMedia.localStream);
    if (session.addStream) {
      console.log('injaaaaaaa',session,localMedia.localStream)
        session.addStream(localMedia.localStream);
    }
    session.accept();
});
client.connect();
var callInfo = document.getElementById('callInfo');
callInfo.onsubmit = function (e) {
  e.preventDefault();
  var jid = document.getElementById('peer').value;
  navigator.getUserMedia({ video: true },
    function(stream) {
      var sess = client.jingle.createMediaSession(jid);
      sess.addStream(stream);
      sess.start();
       var video = document.querySelector('#localVideo');
       video.srcObject = stream;

    },
    function(err) {
       console.log("The following error occurred: " + err.name);
    }
 );


  
  
};




client.on('raw:incoming', function (data) {
  inlog(data);
});
client.on('raw:outgoing', function (data) {
  outlog(data.toString());
});
  
  client.jingle.on('sentFile', function(session, metadata) {
      console.log('sent', metadata);
  });
  client.jingle.on('receivedFile', function(session, file, metadata) {
      //saveAs(file, metadata.name); // -- https://github.com/eligrey/FileSaver.js
      var href = document.getElementById('received');
      href.href = URL.createObjectURL(file);
      href.download = metadata.name;
      var text = 'Click to download ' + metadata.name + ' (' + metadata.size + ' bytes)';
      href.appendChild(document.createTextNode(text));
      href.style.display = 'block';
  });
  // localMedia.start();

  return false;
};
// file select
function handleFileSelect(evt) {
    var file = evt.target.files[0]; // FileList object
    console.log('file', file.name, file.size, file.type, file.lastModifiedDate);
    var jid = document.getElementById('filepeer').value;
    var sess = client.jingle.createFileTransferSession(jid);
    sess.start(file);
}
document.getElementById('files').addEventListener('change', handleFileSelect, false);
function takeSnapshot() {
  var canvasEl = document.createElement('canvas');
  var localVideoEl = document.getElementById('localVideo');
  var w = 320; //localVideoEl.videoWidth;
  var h = 240; //localVideoEl.videoHeight;
  canvasEl.width = w;
  canvasEl.height = h;
  var context = canvasEl.getContext('2d');
  context.fillRect(0, 0, w, h);
  context.translate(w/2, h/2);
  context.scale(-1, 1);
  context.translate(w/-2, h/-2);
  context.drawImage(
      localVideoEl,
      0, 0, w, h
  );
  // toBlob would be nice...
  var url = canvasEl.toDataURL('image/jpg');
  var data = url.match(/data:([^;]*);(base64)?,([0-9A-Za-z+/]+)/);
  var raw = atob(data[3]);
  var arr = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) {
      arr[i] = raw.charCodeAt(i);
  }
  return new Blob([arr], {type: data[1] });
}
var snapshot = document.getElementById('snapshot');
snapshot.onsubmit = function (e) {
  e.preventDefault();
  var file = takeSnapshot();
  file.name = 'snapshot-' + (new Date()).getTime() + '.png';
  file.lastModifiedDate = new Date();
  console.log('file', file.name, file.size, file.type, file.lastModifiedDate);
  var jid = document.getElementById('snappeer').value;
  var sess = client.jingle.createFileTransferSession(jid);
  sess.start(file);
  return false;
};