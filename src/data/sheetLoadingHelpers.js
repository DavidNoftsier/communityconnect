import Tabletop from 'tabletop';
import { find_in_object, update_criteria, criteria_list } from '../utils/FilterHelper.js';

function normalizeHeaders(element) {
  element["name"] = element["name"];
  element["id"] = element["rowNumber"];
  element["tags"] = String(element["type"]).split(", ");
  // element["twitterUrl"] = element["twitterurl"];
  // element["facebookUrl"] = element["facebookurl"];
  // element["instagramUrl"] = element["instagramurl"];
  if (element["lat"] && element["lon"]) {
    element["coordinates"] = { lat: parseFloat(element["lat"]), lng: parseFloat(element["lon"]) }
  }

  if (element.city || element.address || element.state || element.zip) {
    // element.location = element.address+ " " + element.city + ", " + element.state + " " + element.zipcode;
    element.location = [element.address, element.city, element.state, element.zip].join('\n');
  } else {
    element.location = "";
  }

}

function createMarkerId({lat, lng}){
  return lat.toString() + lng.toString();
}

export function callSheets(selected = "", filterType = "") {
  let filter_criteria_list = [];
  let filtered_json = {};

  var revere_key = 'https://docs.google.com/spreadsheets/d/19lFCiw19a5FVb8jhn_i2cJJtTyPl9lQ5NAYZxuVXIs8/pubhtml';
    Tabletop.init({
    key: revere_key,
    simpleSheet: true,
    prettyColumnNames: false,
    postProcess: normalizeHeaders,
    callback: (_data, tabletop) => {

      const categories = {};
      const tags = {};
      var data = tabletop.sheets("Sheet1").elements;
      debugger;
      for (let project of data) {
        let category = project.type.split(',');
        category.forEach(cat => categories[cat] = cat.trim());
        for (let tag of project.tags) { tags[tag] = "" };
      }
      const categoryList = [...(new Set(Object.values(categories)))];

      var my_json = JSON.stringify(data);

      if (selected.length > 0 && filterType == "type") {
        filter_criteria_list = update_criteria(selected, filter_criteria_list);
      }

      filtered_json = filter_criteria_list.length <= 0 ? data : find_in_object(JSON.parse(my_json), { categoryautosortscript: filter_criteria_list });

      if (selected.length > 0 && filterType == "name") {
        filtered_json = filtered_json.filter(function (i) {
          return i.name.toLowerCase().match(selected.toLowerCase());
        });
      }

      // filtered_json = filtered_json.filter(function (org) { return org.truefalsevetting === 'TRUE' });

      filtered_json.forEach(obj => { obj.isMarkerOpen = false; });

      //This creates a hash table based for the lat and long of each loction.
      //This allows us to group all organizations at the same location together. 
      var locationAddressHashTable = {};

      Object.entries(filtered_json).forEach(([index,  org]) =>{

      if(org.coordinates){

        if(locationAddressHashTable.hasOwnProperty(createMarkerId(org.coordinates))){

            locationAddressHashTable[createMarkerId(org.coordinates)]['orgs'].push(index)

      } else {
          locationAddressHashTable[createMarkerId(org.coordinates)] = {'orgs': [index] , isOpen: false }
      }
      }})

      this.setState({
        locationAddressHashTable : locationAddressHashTable,
        orgs: filtered_json,
        categories: categoryList,
        tags: Object.keys(tags)
      });

    }
  });
}
