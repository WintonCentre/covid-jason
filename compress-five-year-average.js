const fs = require("fs");
const {csvParse} = require("d3-dsv");

const averages = [];

const data = csvParse(fs.readFileSync("five-year-average.csv", "utf-8"));
const WEEK_COLUMN = data.columns[0];
const columns = data.columns.slice(1);

data.forEach(d => {
  averages[+d[WEEK_COLUMN]] = columns.reduce((a, v) => a + +d[v], 0);
});

fs.writeFileSync("five-year-average.js", `export const FIVE_YEAR_AVERAGE = ${JSON.stringify(averages)}`);
