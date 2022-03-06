let map;
let waypoints = []; // waypoints in original order
let origin; //start point (transportation center)
let destination; //end point (school)
let address_list; // list of all addresses from the text area
let old_time = 0; //in seconds
let old_dist = 0; //in meters
let new_time = 0; //in seconds
let new_dist = 0; //in meters 
let optimized_waypoints = []; // holds the order of the optimized route
let results_showing = false; // tells if results are printed on the screen
let optimize_button_showing = false; // tells if the optimize! button is showing
let points_plotted = 0; // tells how many bus stops plotted

// This function creates a map and is called when the page loads
function createMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 39.6295, lng: -79.9559},
    zoom: 11,
  });
}

// Creates a marker with lat, lng, and color
function createMarker(lat, lng, color) {
  newMarker = new google.maps.Marker({
    position: { lat: lat, lng: lng },
    map: map,
    icon: color,
  });
}

// Sends address inside request to Google and gets coordinates
async function queryMapsApi(service, request, wait, type) {
  // We need to use async because we want to a wait timer
  const delay = time => new Promise(res => setTimeout(res, time)); // Code from stackoverflow
  await delay(wait)
  
  await service.findPlaceFromQuery(request, function(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      let lat = results[0].geometry.location.lat()
      let lng = results[0].geometry.location.lng()
      let color = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
      // adds new point to the waypoints array
      if (type == "WAYPOINT") {
        waypoints.push({
          location: results[0].geometry.location,
        });
      } else if (type == "ORIGIN") {
        origin = results[0].geometry.location
        color = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
      } else if (type == "DESTINATION") {
        destination = results[0].geometry.location
        color = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
      }      
      createMarker(lat, lng, color);
    }
    else{
      // Google rturned error
      console.log(status)
      console.log(results)
    }
  });  
}

// plots all addresses entered in the text area
function plotPoints(inputTextArea) {
  points_plotted = 0; // no points have been plotted
  waypoints = [] // Clear global waypoints variable
  let wait_time = 0; // wait time so that the query limit is not exceeded
  // addresses is an array of the lines of addresses
  let addresses = readText(inputTextArea); 
  let service = new google.maps.places.PlacesService(map); // lets us use Google Maps API

  origin = document.getElementById("origin").value;
  let request = {
    query: origin,
    fields: ['name', 'geometry'],
  };
  queryMapsApi(service, request, wait_time, "ORIGIN")
  points_plotted++;

  destination = document.getElementById("destination").value;
  request = {
    query: destination,
    fields: ['name', 'geometry'],
  };
  queryMapsApi(service, request, wait_time, "DESTINATION")
  points_plotted++;
  console.log(points_plotted);

  // plots all waypoints
  for (let i = 0; i < addresses.length; i++){
    let address = addresses[i];
    request = {
      query: address,
      fields: ['name', 'geometry'],
    };    
    wait_time += Math.floor(i/5) * 226 // Wait time based on number of addresses
    queryMapsApi(service, request, wait_time, "WAYPOINT")
    points_plotted++;
    console.log(points_plotted);
  }
  console.log("final: " + points_plotted);
  console.log(addresses.length + 2);
  // checks to see if all points are plotted
  if(points_plotted == addresses.length + 2 && !optimize_button_showing){
    createOptimizeButton();
  }
}

// creates the optimize! button
function createOptimizeButton(){
  let buttonDiv = document.getElementById("optimizeButton") 
  let btn = document.createElement("button"); // creates an element
  btn.innerHTML = "Optimize!"; // text on the button
  btn.setAttribute("class", "button"); // the button is a button object
  btn.addEventListener("click", calculateOptimization); // calculates the optimization when clicked
  buttonDiv.appendChild(btn); // adds button to the screen
  optimize_button_showing = true;
}

//calculates and sets global variables for old distance, old time, new distance, new time 
function calculateOptimization(){
  // original route
  var request = {
    origin: origin,
    destination: destination,
    travelMode: 'DRIVING',
    waypoints: waypoints,
    optimizeWaypoints: false     
  };

  let directionsService = new google.maps.DirectionsService(); 
  directionsService.route(request, function(response, status) {
    if (status == 'OK') {
      current_route = response.routes[0]; //taking the first entry of routes, the default
      // old distance
      old_dist = 0
      old_time = 0
      for(let i = 0; i < current_route.legs.length; i++){
        old_dist += current_route.legs[i].distance.value;
        old_time += current_route.legs[i].duration.value;
      }

      // optimizes waypoints
      request = {
        origin: origin,
        destination: destination,
        travelMode: 'DRIVING',
        waypoints: waypoints,
        optimizeWaypoints: true     
      }

      directionsService.route(request, function(response, status) {
        if (status == 'OK') {
          current_route = response.routes[0];
          optimized_waypoints = current_route.waypoint_order;
          console.log("waypoints " + waypoints);
          console.log(optimized_waypoints);
          // new distance
          new_dist = 0
          new_time = 0
          for(let i = 0; i < current_route.legs.length; i++){
            new_dist += current_route.legs[i].distance.value;
            new_time += current_route.legs[i].duration.value;
          }
          displayResults();
        }
      })
    }
  });
  
}

// prints results, new route ordering, and calculations 
function displayResults() {
  if(results_showing){
    //creates places for the results, new route, and calculations to appear
    document.getElementById("results").innerHTML = "";
    document.getElementById("new route").innerHTML = "";
    document.getElementById("calculations").innerHTML = "";
  }
  let resultsDiv = document.getElementById("results")
  let div = document.createElement("div");
  div.innerHTML += "Current Route Length:<b> "+ Math.round(old_dist/1600) + " miles </b> <br>";
  div.innerHTML += "Optimized Route Length:<b> " + Math.round(new_dist/1600) + " miles</b><br>";
  div.innerHTML += "Distance Saved:<b> " + Math.round((old_dist-new_dist)/1600) + " miles</b><br>"; 
  div.innerHTML += "Current Route Duration:<b> " + Math.round(old_time/60) + " minutes</b><br>"; 
  div.innerHTML += "Optimized Route Duration:<b> " + Math.round(new_time/60) + " minutes</b><br>"; 
  div.innerHTML += "Time Saved:<b> " + Math.round((old_time-new_time)/60) + " minutes</b><br>";
  let printed_indexes = [];

  // prints the optimized ordering of stops
  for(let i = 0; i < optimized_waypoints.length; i++){
    printed_indexes.push(optimized_waypoints[i] + 1);
  }
  div.innerHTML += "New Stop Ordering: <b>" + printed_indexes + "</b><br>";

  // prints out the addresses of optimized route
  let newRouteDiv = document.getElementById("new route")
  let div3 = document.createElement("div");
  for(let i = 0; i < optimized_waypoints.length; i++){
    div3.innerHTML += address_list[optimized_waypoints[i]] + "<br>";
  }

  //prints calculations
  let calculationDiv = document.getElementById("calculations")
  let div2 = document.createElement("div2");
  div2.innerHTML += "CO2 Emissions Saved: " + ((old_dist-new_dist)/1600*1.45/1000*180*2).toFixed(2) + " metric tons<br>";
  div2.innerHTML += "Fuel Cost Saved: $"+ Math.round((old_dist-new_dist)/1600*3.74/7*180*2) + "<br>";

  resultsDiv.appendChild(div);
  calculationDiv.appendChild(div2);
  newRouteDiv.appendChild(div3);
  results_showing = true;
}

// returns a array of the input text with each element being one line
function readText(inputTextArea) {
  let textArea = document.getElementById(inputTextArea);
  address_list = textArea.value.split("\n"); // arrayOfLines is array where every element is string of one line
  return address_list;
}
