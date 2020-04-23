let title = null;
let vurl = null;
let aurl = null;
let vurls = [];
let aurls = [];
let aformat = null;
let vformat = null;
let aformats = [];
let vformats = [];
$(document).ready(function () {
  $("#urlSubmit").click(function () {
    let url = $("#urlInput").val();
    if (url != "") {
      let res = { url: url };
      $.post("../urlstart", res, function (data) {
        title = data.name;
        vurls = [...data.vurls];
        aurls = [...data.aurls];
        vformats = [...data.vformats];
        aformats = [...data.aformats];
        console.log(data);
        selectionMaker(data.vcodecs, data.acodecs);
      });
    }
  });
});

function selectionMaker(vcodecs, acodecs) {
  for (i = 0; i < vcodecs.length; i++) {
    $("#videoSelect").append(`<option value=`+(i+1)+`>`+vcodecs[i]+`</option>`);
  }
  for (i = 0; i < acodecs.length; i++) {
    $("#audioSelect").append(`<option value=`+(i+1)+`>`+acodecs[i]+`</option>`);
  }
}


