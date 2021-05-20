const fs = require("fs");
const {csvParse} = require("d3-dsv");

const averages_by_dataset = {};

["Occurrences", "Registrations"].forEach(dataset => {
  const averages = averages_by_dataset[dataset] = [];

  const data = csvParse(fs.readFileSync(`${dataset}_five_year_average.csv`, "utf-8"));
  const WEEK_COLUMN = data.columns[0];
  const TOTAL_COLUMN = data.columns[data.columns.length - 1];

  data.forEach(d => {
    averages[+d[WEEK_COLUMN]] = +d[TOTAL_COLUMN];
  });
  averages[53] = averages[52];
});

fs.writeFileSync("five-year-average.js", `export const FIVE_YEAR_AVERAGES = ${JSON.stringify(averages_by_dataset)}`);
