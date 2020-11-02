const fs = require("fs");
const {http, https} = require("follow-redirects");
const {csvParse, csvFormat} = require("d3-dsv");
const {rollup, sum} = require("d3-array");

const PLACES = ["Care home", "Home", "Hospital", "Other"];

function normalisePlaceOfDeath(d) {
  return PLACES.indexOf(d) >= 0 ? d : "Other";
}

fetchJSON("https://api.beta.ons.gov.uk/v1/datasets/weekly-deaths-local-authority", json => {
  fetchJSON(json.links.latest_version.href, json => {
    https.get(json.downloads.csv.href, response => {
      const chunks = [];
      response.setEncoding("utf-8");
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => {
        const data = csvParse(chunks.join(""));
        const columns = [
          "v4_0",
          "admin-geography",
          "geography",
          "week",
          "cause-of-death",
          "placeofdeath",
          "registrationoroccurrence",
        ];
        const keyColumns = columns.slice(1);
        const groups = {};
        data.forEach(row => {
          row.placeofdeath = normalisePlaceOfDeath(row["PlaceOfDeath"]);
          row.v4_0 = +row.v4_0;
          row.week = +row["week-number"].split("-").pop();
          row["admin-geography"] = row["administrative-geography"];
          row["geography"] = row.Geography;
          row["registrationoroccurrence"] = row["RegistrationOrOccurrence"];
          const key = csvFormat([row], keyColumns);
          if (groups.hasOwnProperty(key)) {
            groups[key].v4_0 += row.v4_0;
          } else {
            groups[key] = row;
          }
        });

        fs.writeFileSync("data.csv", csvFormat(Object.values(groups), columns));
      });
    });
  });
});

function fetchJSON(url, callback) {
  (/^https/.test(url) ? https : http).get(url, res => {
    res.setEncoding('utf8');
    const data = [];
    res.on("data", chunk => data.push(chunk));
    res.on("end", () => {
      const json = JSON.parse(data.join(""));
      callback(json);
    });
  });
}
