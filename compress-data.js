const fs = require("fs");
const {csvParse, csvFormat} = require("d3-dsv");
const fetch = require("node-fetch");

const PLACES = ["Care home", "Home", "Hospital", "Other"];

// Special-case handling for administrative area changes that happened in 2021.
const MERGED_GEOGRAPHIES = {};
const MERGED_ADMINS = {};

[{
  admin: "E06000061",
  geography: "North Northamptonshire",
  old_admin: [
    "E07000150", // Corby
    "E07000152", // East Northamptonshire
    "E07000153", // Kettering
    "E07000156", // Wellingborough
  ]
 },
 {
  admin: "E06000062",
  geography: "West Northamptonshire",
  old_admin: [
    "E07000151", // Daventry
    "E07000154", // Northampton
    "E07000155", // South Northamptonshire
  ]
}].forEach(({admin, geography, old_admin}) => {
  old_admin.forEach(d => {
    MERGED_ADMINS[d] = admin;
    MERGED_GEOGRAPHIES[d] = geography;
  });
});

function normalisePlaceOfDeath(d) {
  return PLACES.indexOf(d) >= 0 ? d : "Other";
}

function normaliseAdmin(admin) {
  return MERGED_ADMINS[admin] || admin;
}

function normaliseGeography(admin, geography) {
  return MERGED_GEOGRAPHIES[admin] || geography;
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
            const admin = row["administrative-geography"];
            row.placeofdeath = normalisePlaceOfDeath(row["PlaceOfDeath"]);
            row.v4_0 = +row.v4_0;
            row.week = (year - 2020) * 53 + week;
            row["admin-geography"] = normaliseAdmin(admin);
            row["geography"] = normaliseGeography(admin, row.Geography);
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
