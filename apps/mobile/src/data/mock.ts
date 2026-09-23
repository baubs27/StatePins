import { Pin, USState } from "@/types";

const stateRows: [string, string, number, number, number, number][] = [
  ["WA","Washington",0,0,47.4,-120.7],["MT","Montana",0,2,46.9,-110.4],["ND","North Dakota",0,4,47.5,-100.5],["MN","Minnesota",0,5,46.4,-94.6],["WI","Wisconsin",0,6,44.6,-89.6],["MI","Michigan",0,7,44.3,-85.6],["VT","Vermont",0,9,44.0,-72.7],["ME","Maine",0,10,45.3,-69.2],
  ["OR","Oregon",1,0,43.9,-120.6],["ID","Idaho",1,1,44.2,-114.5],["WY","Wyoming",1,2,43.0,-107.6],["SD","South Dakota",1,4,44.4,-100.2],["IA","Iowa",1,5,42.1,-93.5],["IL","Illinois",1,6,40.0,-89.2],["IN","Indiana",1,7,40.3,-86.1],["OH","Ohio",1,8,40.4,-82.8],["NY","New York",1,9,43.0,-75.0],["NH","New Hampshire",1,10,43.7,-71.6],
  ["CA","California",2,0,36.8,-119.4],["NV","Nevada",2,1,38.8,-116.4],["UT","Utah",2,2,39.3,-111.7],["CO","Colorado",2,3,39.0,-105.5],["NE","Nebraska",2,4,41.5,-99.8],["MO","Missouri",2,5,38.5,-92.5],["KY","Kentucky",2,7,37.8,-85.8],["WV","West Virginia",2,8,38.6,-80.6],["PA","Pennsylvania",2,9,41.2,-77.2],["MA","Massachusetts",2,10,42.4,-71.4],
  ["AZ","Arizona",3,1,34.0,-111.1],["NM","New Mexico",3,2,34.5,-106.0],["KS","Kansas",3,4,38.5,-98.4],["AR","Arkansas",3,5,35.2,-92.4],["TN","Tennessee",3,6,35.8,-86.4],["VA","Virginia",3,8,37.4,-78.7],["MD","Maryland",3,9,39.0,-76.7],["CT","Connecticut",3,10,41.6,-72.7],
  ["OK","Oklahoma",4,3,35.6,-97.5],["LA","Louisiana",4,5,31.0,-92.0],["MS","Mississippi",4,6,32.7,-89.7],["AL","Alabama",4,7,32.8,-86.8],["NC","North Carolina",4,8,35.5,-79.4],["NJ","New Jersey",4,9,40.1,-74.7],["RI","Rhode Island",4,10,41.7,-71.6],
  ["TX","Texas",5,3,31.0,-99.9],["GA","Georgia",5,7,32.7,-83.4],["SC","South Carolina",5,8,33.8,-80.9],["DE","Delaware",5,9,39.0,-75.5],
  ["AK","Alaska",6,0,64.2,-152.5],["HI","Hawaii",6,1,19.9,-155.6],["FL","Florida",6,8,27.7,-81.5]
];

const initiallyVisited = new Set(["PA","NY","NJ","MD","VA","OH","WV","DE","MA","CT","FL","CA","CO","TX"]);

export const initialStates: USState[] = stateRows.map(([abbreviation,name,row,column,latitude,longitude]) => ({
  id: abbreviation.toLowerCase(),
  abbreviation,
  name,
  visited: initiallyVisited.has(abbreviation),
  centerCoordinates: { latitude, longitude },
  pinCount: abbreviation === "PA" ? 5 : Math.floor((row + column) % 4),
  mapPosition: { row, column }
}));

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const paPins = [
  ["hawk-mountain","Hawk Mountain Overlook","Kempton","A ridge-top trail with huge sky views and migrating raptors.","Nature","https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",40.64120,-75.98750,248,"mia.travels",8],
  ["old-city","Old City Philadelphia","Philadelphia","Cobblestone blocks, tiny galleries, and the best kind of unplanned afternoon.","Landmark","https://images.unsplash.com/photo-1569761316261-9a8696fa2ca3?auto=format&fit=crop&w=1200&q=80",39.94960,-75.14660,186,"jaywalks",12],
  ["wallenpaupack","Lake Wallenpaupack","Hawley","Go early for still water, dockside coffee, and a quiet loop around the lake.","Hidden Gem","https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80",41.45110,-75.18140,122,"alex.outside",4],
  ["fallingwater","Fallingwater","Mill Run","Frank Lloyd Wright's masterpiece feels even stranger and better in person.","Museum","https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80",39.90088,-79.46668,391,"mia.travels",44],
  ["presque-isle","Presque Isle State Park","Erie","Eleven miles of beaches, lagoons, and an unexpectedly great sunset.","Road Trip Stop","https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",42.15610,-80.09890,203,"localsonly",6],
  ["reading-terminal","Reading Terminal Market","Philadelphia","Go hungry, split everything, and save room for something sweet before you leave.","Food","https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",39.95330,-75.15930,318,"snack.map",61],
  ["ohiopyle-falls","Ohiopyle Falls","Ohiopyle","An easy walk to big water, bike-trail energy, and a town that feels built for detours.","Nature","https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1200&q=80",39.86990,-79.49490,276,"river.ren",35],
  ["cherry-springs","Cherry Springs State Park","Coudersport","Dark-sky stargazing that makes the whole trip feel quieter in the best way.","Hidden Gem","https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80",41.65010,-77.81640,242,"nightdrives",3],
  ["ricketts-glen","Ricketts Glen Falls Trail","Benton","A waterfall-heavy hike where the good part keeps happening again.","Nature","https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",41.33590,-76.30160,289,"trail.tessa",52]
] as const;

export const initialPins: Pin[] = paPins.map((p, index) => ({
  id: p[0], stateId: "pa", name: p[1], city: p[2], description: p[3],
  category: p[4], imageUrl: p[5], coordinates: { latitude: p[6], longitude: p[7] },
  upvotes: p[8], recommendedBy: p[9], savedToItinerary: index === 3,
  createdAt: daysAgo(p[10]),
  comments: index < 2 ? [{
    id: `comment-${index}`, pinId: p[0], username: "roadside.ren",
    text: index === 0 ? "The sunrise loop is absolutely worth the early alarm." : "Grab coffee on 3rd before wandering.",
    createdAt: "2h"
  }] : []
}));

export const activities = [
  { id: "1", icon: "pin", title: "Mia added a new pin in Colorado", meta: "Garden of the Gods · 18m" },
  { id: "2", icon: "heart", title: "Jay upvoted your recommendation", meta: "Fallingwater · 1h" },
  { id: "3", icon: "chatbubble", title: "Alex commented on Fallingwater", meta: "“Adding this to our fall trip.” · 3h" },
  { id: "4", icon: "checkmark-circle", title: "Ren visited their 24th state", meta: "New Mexico · Yesterday" }
];
