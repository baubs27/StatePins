import { Pin, USState } from "@/types";
import { MAP_ATTRIBUTION, MAP_TILE_URL } from "./leafletConfig";

type Coordinates = { latitude: number; longitude: number };
type StateFeature = { type: "Feature"; properties?: { name?: string }; geometry: unknown };

type NativeMapConfig = {
  kind: "us" | "state";
  center: Coordinates;
  zoom: number;
  location: Coordinates | null;
  states: USState[];
  pins: Pin[];
  visitedOnly?: boolean;
  features?: StateFeature[];
};

function serialize(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function createLeafletDocument(config: NativeMapConfig) {
  const source = serialize({
    ...config,
    tileUrl: MAP_TILE_URL,
    attribution: MAP_ATTRIBUTION
  });

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://unpkg.com; style-src 'unsafe-inline' https://unpkg.com; img-src https: http: data:; font-src https://unpkg.com data:;">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
html,body,#map{height:100%;width:100%;margin:0;background:#e8f0ee;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.leaflet-container{background:#e8f0ee}.leaflet-control-zoom{border:1px solid #dce3e8!important;border-radius:13px!important;overflow:hidden;box-shadow:0 5px 18px #10243e24!important}.leaflet-control-zoom a{width:36px!important;height:36px!important;line-height:36px!important;color:#18304b!important}.leaflet-control-attribution{font-size:9px;background:#ffffffd9!important}
.stateup-check{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border:2px solid #18304b;border-radius:8px;background:#fff;color:#fff;font:900 15px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 2px 8px #10243e40}.stateup-check.visited{border-color:#2477e8;background:#2477e8}.leaflet-marker-icon.stateup-state-marker:hover .stateup-check{transform:scale(1.13)}
.leaflet-popup-content-wrapper{border-radius:14px}.leaflet-popup-content{margin:12px;min-width:150px}.stateup-popup img{display:block;width:100%;max-height:120px;object-fit:cover;border-radius:9px;margin-bottom:7px}.stateup-popup strong,.stateup-popup span{display:block;color:#18304b}.stateup-popup span{font-size:12px;color:#6f7d8b;margin-top:3px}.stateup-popup button{margin-top:9px;border:0;border-radius:9px;padding:8px 10px;background:#2477e8;color:white;font-weight:800}
.stateup-photo-pin{background:transparent;border:0}.stateup-photo-marker{box-sizing:border-box;display:block;width:44px;height:44px;overflow:hidden;border:3px solid #fff;border-radius:15px;background:#2477e8;box-shadow:0 4px 12px #10243e47}.stateup-photo-marker img{width:100%;height:100%;object-fit:cover}
.stateup-locate{width:38px;height:38px;border:1px solid #dce3e8;border-radius:12px;background:#fff;color:#2477e8;box-shadow:0 5px 18px #10243e24;font-size:20px;font-weight:800}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
const cfg=${source};
const map=L.map('map',{zoomControl:false,worldCopyJump:false,preferCanvas:true}).setView([cfg.center.latitude,cfg.center.longitude],cfg.zoom);
L.tileLayer(cfg.tileUrl,{maxZoom:19,attribution:cfg.attribution}).addTo(map);
L.control.zoom({position:'topright'}).addTo(map);
const post=(message)=>{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(message))};
const stateMarkers=new Map();
const stateLayers=new Map();
let pinLayer=L.layerGroup().addTo(map);
let locationLayer=null;
const stateByName=()=>new Map(cfg.states.map(s=>[s.name,s]));
function stateIcon(state){return L.divIcon({className:'stateup-state-marker',iconSize:[26,26],iconAnchor:[13,13],html:'<span class="stateup-check '+(state.visited?'visited':'')+'">'+(state.visited?'✓':'')+'</span>'})}
function paintStates(){const byName=stateByName();stateMarkers.forEach((marker,id)=>{const state=cfg.states.find(item=>item.id===id);if(state){marker.setIcon(stateIcon(state));marker.setOpacity(cfg.visitedOnly&&!state.visited?0.08:1)}});stateLayers.forEach((layer,name)=>{const state=byName.get(name);if(state)layer.setStyle({color:'#fff',weight:1.3,opacity:cfg.visitedOnly&&!state.visited?0.18:0.95,fillColor:state.visited?'#73c994':'#e5edf0',fillOpacity:cfg.visitedOnly&&!state.visited?0.04:(state.visited?0.38:0.24)})})}
function makePinPopup(pin){const box=document.createElement('div');box.className='stateup-popup';if(pin.imageUrl&&/^https:\/\//i.test(pin.imageUrl)){const img=document.createElement('img');img.src=pin.imageUrl;img.alt='';img.loading='lazy';box.appendChild(img)}const title=document.createElement('strong');title.textContent=pin.name;box.appendChild(title);const meta=document.createElement('span');meta.textContent=pin.city+' · '+pin.upvotes+' upvotes';box.appendChild(meta);const button=document.createElement('button');button.type='button';button.textContent='See recommendation';button.addEventListener('click',()=>post({type:'openPin',id:pin.id}));box.appendChild(button);return box}
function safeImageUrl(value){if(typeof value!=='string'||!/^https?:\/\//i.test(value))return '';return value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}
function paintPins(pins){pinLayer.clearLayers();pins.forEach(pin=>{const featured=pin.upvotes>=250;const image=safeImageUrl(pin.imageUrl);const showPhoto=!!image&&(featured||map.getZoom()>=13);let marker;if(showPhoto){const icon=L.divIcon({className:'stateup-photo-pin',iconSize:[44,44],iconAnchor:[22,22],html:'<span class="stateup-photo-marker"><img src="'+image+'" alt=""></span>'});marker=L.marker([pin.coordinates.latitude,pin.coordinates.longitude],{icon,zIndexOffset:featured?500:100}).addTo(pinLayer)}else{marker=L.circleMarker([pin.coordinates.latitude,pin.coordinates.longitude],{radius:featured?13:9,color:'#fff',weight:3,fillColor:featured?'#ef6f5d':'#2477e8',fillOpacity:1}).addTo(pinLayer)}marker.bindTooltip(pin.name,{direction:'top'});marker.bindPopup(makePinPopup(pin))})}
function paintLocation(location,center){if(locationLayer){map.removeLayer(locationLayer);locationLayer=null}if(!location)return;locationLayer=L.circleMarker([location.latitude,location.longitude],{radius:8,color:'#fff',weight:3,fillColor:'#1598e5',fillOpacity:1}).addTo(map);locationLayer.bindTooltip('You are here',{permanent:true,direction:'top',offset:[0,-8]});if(center)map.flyTo([location.latitude,location.longitude],Math.max(map.getZoom(),12),{duration:.7})}
function initStates(){if(cfg.kind!=='us')return;const byName=stateByName();(cfg.features||[]).forEach(feature=>{const name=feature.properties&&feature.properties.name;const state=byName.get(name);if(!state)return;const layer=L.geoJSON(feature,{style:{color:'#fff',weight:1.3,fillColor:state.visited?'#73c994':'#e5edf0',fillOpacity:state.visited ? 0.38 : 0.24}}).addTo(map);stateLayers.set(name,layer);layer.on('click',()=>post({type:'openState',id:state.id}));layer.bindTooltip(name,{sticky:true})});cfg.states.forEach(state=>{const marker=L.marker([state.centerCoordinates.latitude,state.centerCoordinates.longitude],{icon:stateIcon(state),keyboard:true,title:state.name+': '+(state.visited?'visited':'not visited')}).addTo(map);stateMarkers.set(state.id,marker);marker.on('click',event=>{L.DomEvent.stopPropagation(event);post({type:'toggleState',id:state.id})})});paintStates();const geo=L.featureGroup(Array.from(stateLayers.values()));if(geo.getLayers().length)map.fitBounds(geo.getBounds(),{padding:[20,22]})}
const Locate=L.Control.extend({onAdd:function(){const button=L.DomUtil.create('button','stateup-locate');button.type='button';button.title='Center on my location';button.setAttribute('aria-label','Center on my location');button.textContent='⌖';L.DomEvent.disableClickPropagation(button);L.DomEvent.on(button,'click',()=>{if(cfg.location)map.flyTo([cfg.location.latitude,cfg.location.longitude],Math.max(map.getZoom(),12),{duration:.7});else post({type:'requestLocation'})});return button}});new Locate({position:'topright'}).addTo(map);
window.stateupUpdate=function(next){if(next.states){cfg.states=next.states;paintStates()}if(Object.prototype.hasOwnProperty.call(next,'visitedOnly')){cfg.visitedOnly=!!next.visitedOnly;paintStates()}if(Object.prototype.hasOwnProperty.call(next,'pins')){cfg.pins=next.pins||[];paintPins(cfg.pins)}if(Object.prototype.hasOwnProperty.call(next,'location')){cfg.location=next.location;paintLocation(cfg.location,!!next.centerLocation)}};
map.on('zoomend',()=>{if(cfg.pins)paintPins(cfg.pins)});
initStates();paintPins(cfg.pins||[]);paintLocation(cfg.location,false);window.stateupMapReady=true;post({type:'ready'});
})();
</script></body></html>`;
}
