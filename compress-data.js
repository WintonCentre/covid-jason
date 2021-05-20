const fs = require("fs");
const {csvParse, csvFormat} = require("d3-dsv");
const fetch = require("node-fetch");

const PLACES = ["Care home", "Home", "Hospital", "Other"];

function normalisePlaceOfDeath(d) {
  return PLACES.indexOf(d) >= 0 ? d : "Other";
}

main();

async function main() {

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

  const editions_url = await fetch("https://api.beta.ons.gov.uk/v1/datasets/weekly-deaths-local-authority")
      .then(response => response.json())
      .then(json => json.links.editions);
  const dataset_urls = await fetch(editions_url)
      .then(response => response.json())
      .then(json => json.items
          .filter(d => isFinite(+d.edition))
          .map(d => d.links.latest_version));
  await Promise.all(dataset_urls.map(async url => {
    const csv_url = await fetch(url)
        .then(response => response.json())
        .then(json => json.downloads.csv.href);
    return fetch(csv_url)
        .then(response => response.text())
        .then(text => {
          const data = csvParse(text);
          data.forEach(row => {
            const year = +row["calendar-years"];
            const week = +row["week-number"].split("-").pop();
            row.placeofdeath = normalisePlaceOfDeath(row["PlaceOfDeath"]);
            row.v4_0 = +row.v4_0;
            row.week = (year - 2020) * 53 + week;
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
        });
  }));

  const rows = Object.values(groups).sort((a, b) => a.week - b.week);
  fs.writeFileSync("data.csv", csvFormat(rows, columns));
}
