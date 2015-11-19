var root = 'http://184.169.128.35:8080';
//var root = 'http://localhost:8080';
var mapboxTiles = L.tileLayer('https://api.mapbox.com/v4/devseed.07f51987/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGV2c2VlZCIsImEiOiJnUi1mbkVvIn0.018aLhX0Mb0tdtaT2QNe2Q', {
    minZoom: 2
});

var teamA = 'gmu';
var teamB = 'hmsgw';

//initiate map and set initial extent
var map = L.map('map', { zoomControl: false })
    .addLayer(mapboxTiles)
    .setView([18.025966, -5], 2)
    .setMaxBounds([ [89, -180], [-89, 180] ]);

var geojsonLayer = L.geoJson().addTo(map);

var nextTimelineA = [];
var nextTimelineB = [];
var currentTimeline = [];
var paused = false;
var progressBarWidth = 0;
var currentProgress = 0;

//clears out sidebar
function reset () {
  $('#logroll').empty();
  $('#progress-bar').css('width', '0%');

  //currentTimeline = nextTimeline;

  currentTimelineA = nextTimelineA;
  currentTimelineB = nextTimelineB;

  progressBarWidth = currentTimeline.length;

  //currentTimeline.unshift('LAST');

  currentTimelineA.unshift('LAST');
  currentTimelineB.unshift('LAST');

  currentProgress = 0;
}

//how do you get two timelines?
//http://stackoverflow.com/questions/9898813/jquery-wait-till-multiple-get-requests-are-successully-processed

var nextTimelineA;
var nextTimelineB;

var timelineA = $.get(root + '/timeline' + '/gmu', function (timeline) {
    //The preprocessTimeline function is in a seperate file and pre-processes the timeline json
    nextTimelineA = preprocessTimeline(timeline);
});

var timelineB = $.get(root + '/timeline' + '/hmsgw', function (timeline) {
    //The preprocessTimeline function is in a seperate file and pre-processes the timeline json
    nextTimelineB = preprocessTimeline(timeline);
});


$.when(timelineA, timelineB).done(function() {

    console.log('ok, we finished both get requests')

    //fills the Leaderboard with top 10 mappers by changes created
    fillLeaderboard('changes',teamA);
    fillLeaderboard('changes',teamB);

    console.log('leaderboards filled')

    reset();

    $('#spinner').hide();
    $('#spinner2').hide();

    //renders every 3 seconds on the web map
    var count = 0;
    setInterval(function () {
      count += 1;
      if(count % 2 !== 0) {
        if (!paused) {
          render(currentTimelineA.pop(),teamA);
        }
      } else { 
        if (!paused) {
          render(currentTimelineB.pop(),teamB);
        }
      }
    }, 3000);
});


function render (element,team) {
    //when you get to the last entry in the timeline, pause for 3 sec and get the next timeline
    if (element === 'LAST') {
      paused = true;
      setTimeout(function () {
        paused = false;
        $.get(root + '/timeline' + '/' + team, function (timeline) {
          if (team == 'gmu') {
            nextTimelineA = preprocessTimeline(timeline);
          } else {
            nextTimelineB = preprocessTimeline(timeline);
          }
          reset();
        });
      }, 3000);
      return;
    }


    var logroll = $('#logroll'+team);

    var timecode = new Date(Date.parse(element.properties.created_at));
    var minutefix = timecode.getMinutes();

    if(minutefix < 10){
      minutefix = "0" + minutefix;
    };

    var date = timecode.getHours() + ':' + minutefix;  geojsonLayer.clearLayers();

    console.log(element);

    if (element.features.length) {
      geojsonLayer.addData(element);
    } else {
      var meta = element.properties;
      geojsonLayer.addData({
        'type': 'Feature',
        'geometry': {
          'type': 'Polygon',
          'coordinates': [[
            [meta.min_lon, meta.min_lat],
            [meta.max_lon, meta.min_lat],
            [meta.max_lon, meta.max_lat],
            [meta.min_lon, meta.max_lat],
            [meta.min_lon, meta.min_lat]
          ]]
        }
      });
    }

    map.fitBounds(geojsonLayer.getBounds(), {maxZoom: 16});
    $('#editor_name').empty();
    $('#editor_name').append('Contributions from <h1>' + element.properties.user + '</h1>');

    currentProgress += 1;
    $('#progress-bar').css('width', (100 * currentProgress / progressBarWidth) + '%');

    logroll.prepend('<div class="logroll-item"><i>' +
                    date + '</i> - ' +
                    element.properties.user + '</div>');

    if (logroll.children().length > 100) {
      $('#logroll div:last-child').remove();
    }
}

//after 5 minutes updates leaderboard with changes, this is a global variable
var fillEvery5 = setInterval(function () {
  fillLeaderboard('changes',teamA);
}, 5 * 60 * 1000);

//after 5 minutes updates leaderboard with changes, this is a global variable
var fillEvery5 = setInterval(function () {
  fillLeaderboard('changes',teamB);
}, 5 * 60 * 1000);

//needs a second argument
function fillLeaderboard (hash,schoolhash) {
  
//update this
  $('#leaderboard-teamA').empty();
  $('#leaderboard-teamB').empty();
  $('#Total').empty();

  $.get(root + '/' + hash + '/' + schoolhash, function (data) {
    for (var i = 2; i < data.length; i += 2) {
      var rank = (i / 2);

      var username = data[i];
      if (data[i].length > 20) {
        username = username.substring(0, 17) + '...';
      }

      $('#leaderboard-teamA').append(
        '<li>' + rank + '.  ' + username + ' <i>' + numberFormat(data[i + 1],",") + '</i></li>'
      );
    }

    var total = 0;
    if (data.length) {
      total = data[1];
      total = numberFormat(total,",")
    }

    $('#Total').append(
      '<li>Total Contributions:<i> ' + total + '</i></li>'
    );
  });

  //stops the timer
  clearInterval(fillEvery5);

  //after 5 minutes updates leaderboard with changes
  //will clicking the buttons for other types reset the 5 min timer for changes?
  fillEvery5 = setInterval(function () {
    fillLeaderboard(hash);
  }, 5 * 60 * 1000);
}

//fills the Leaderboard with top 10 mappers by changes created when they click on the Leaderboard-All button
$('#Leaderboard-All-teamA').click(function () {
  fillLeaderboard('changes',teamA);
  return $('#leadertitletext').text('LEADERBOARDS');
});

//fills the Leaderboard with top 10 mappers by buildings created when they click on the Leaderboard-Building button
$('#Leaderboard-Building-teamA').click(function () {
  fillLeaderboard('buildings',teamA);
  return $('#leadertitletext').text('BUILDINGS');
});

//fills the Leaderboard with top 10 mappers by highways created when they click on the Leaderboard-Roads button
$('#Leaderboard-Roads-teamA').click(function () {
  fillLeaderboard('highways',teamA);
  return $('#leadertitletext').text('ROADS');
});

//fills the Leaderboard with top 10 mappers by waterways created when they click on the Leaderboard-Rivers button
$('#Leaderboard-Rivers-teamA').click(function () {
  fillLeaderboard('waterways',teamA);
  return $('#leadertitletext').text('RIVERS');
});



//fills the Leaderboard with top 10 mappers by changes created when they click on the Leaderboard-All button
$('#Leaderboard-All-teamB').click(function () {
  fillLeaderboard('changes',teamB);
  return $('#leadertitletext').text('LEADERBOARDS');
});

//fills the Leaderboard with top 10 mappers by buildings created when they click on the Leaderboard-Building button
$('#Leaderboard-Building-teamB').click(function () {
  fillLeaderboard('buildings',teamB);
  return $('#leadertitletext').text('BUILDINGS');
});

//fills the Leaderboard with top 10 mappers by highways created when they click on the Leaderboard-Roads button
$('#Leaderboard-Roads-teamB').click(function () {
  fillLeaderboard('highways',teamB);
  return $('#leadertitletext').text('ROADS');
});

//fills the Leaderboard with top 10 mappers by waterways created when they click on the Leaderboard-Rivers button
$('#Leaderboard-Rivers-teamB').click(function () {
  fillLeaderboard('waterways',teamB);
  return $('#leadertitletext').text('RIVERS');
});


//http://stackoverflow.com/questions/8677805/formatting-numbers-decimal-places-thousands-separators-etc-with-css
function numberFormat(_number, _sep) {
    _number = typeof _number != "undefined" && _number > 0 ? _number : "";
    _number = _number.replace(new RegExp("^(\\d{" + (_number.length%3? _number.length%3:0) + "})(\\d{3})", "g"), "$1 $2").replace(/(\d{3})+?/gi, "$1 ").trim();
    if(typeof _sep != "undefined" && _sep != " ") {
        _number = _number.replace(/\s/g, _sep);
    }
    return _number;
}

