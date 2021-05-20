import {select} from "d3-selection";
import {csvParse, csvParseRows} from "d3-dsv";
import {extent, rollup, sum} from "d3-array";
import {scaleLinear, scaleUtc} from "d3-scale";
import {format} from "d3-format";
import {utcDay, utcMonth} from "d3-time";
import {utcFormat, utcParse} from "d3-time-format";
import {axisLeft, axisRight, axisBottom} from "d3-axis";

import {FIVE_YEAR_AVERAGES} from "./five-year-average";
const PLACES = ["Care home", "Home", "Hospital", "Other"];

const formatDate = utcFormat("%Y-%m-%d");
const parseDate = utcParse("%Y-%m-%d");
const formatNumber = format(",d");

const WEEK0 = parseDate("2019-12-21");
const DEFAULT_START_WEEK = "2020-02-29";
const REGIONS = [
  {label: "England and Wales", test: (d => true)},
  {label: "England", test: (d => /^E/.test(d))},
  {label: "Wales", test: (d => /^W/.test(d))},
];

let all_data;

function changed() {
  const settings = {
    plot_type: select("#plot_type").property("value"),
    area: select("#area").property("value"),
    dataset: select("#dataset").property("value"),
    start_date: parseDate(select("#start_date").property("value")),
    stop_date: parseDate(select("#stop_date").property("value")),
  };

  select("#title").text(settings.area);

  const regionIndex = REGIONS.map(d => d.label).indexOf(settings.area);
  const matchesArea = regionIndex >= 0
      ? (d => REGIONS[regionIndex].test(d["admin-geography"]))
      : (d => d.geography === settings.area);

  const data = all_data.filter(d => {
    return matchesArea(d) &&
      d.registrationoroccurrence === settings.dataset &&
      settings.start_date <= d.date && d.date <= settings.stop_date;
  });

  updateChart(settings, data);
  updateTable(settings, data);
  updateTableCaption(settings);
}

fetch("data.csv")
    .then(response => response.text())
    .then(csv => {
      let rows = csvParse(csv, );
      let maxWeek = 0;
      rows.forEach(row => {
        row.v4_0 = +row.v4_0;
        row.week = +row.week;
        maxWeek = Math.max(row.week, maxWeek);
        row.date = utcDay.offset(WEEK0, 7 * row.week);
      });
      const scale = computeScale(rows);
      rows.forEach(row => {
        row.fiveyearaverage = row["cause-of-death"] === "all-causes" ? FIVE_YEAR_AVERAGES[row.registrationoroccurrence][1 + ((row.week - 1) % 53)] * scale.get(row.geography).get(row.placeofdeath) : 0;
      });
      all_data = rows;
      {
        const localAuthorities = Array.from(scale.keys()).sort();
        select("#area").append("optGroup").attr("label", "Regions")
          .selectAll("option").data(REGIONS)
          .enter().append("option").property("value", d => d.label).text(d => d.label);
        select("#area").append("optGroup").attr("label", "Local authorities")
          .selectAll("option").data(localAuthorities)
          .enter().append("option").property("value", String).text(String);

        const weeks = [];
        for (let week = 1; week <= maxWeek; ++week) {
          weeks.push(utcDay.offset(WEEK0, 7 * week));
        }
        select("#start_date").selectAll("option").data(weeks).enter().append("option").property("value", formatDate).text(formatDate);
        select("#start_date").property("value", DEFAULT_START_WEEK);
        select("#stop_date").selectAll("option").data(weeks).enter().append("option").property("value", formatDate).text(formatDate);
        select("#stop_date").property("value", formatDate(weeks.pop()));

        $("select").selectize({onChange: changed});
      }
      select(window).on("resize", changed);
      changed();
    });

function computeScale(data) {
  // Estimate % of deaths that occur during normal times.  If we included the
  // whole year, it would overestimate the number of deaths we expect in e.g.
  // Brent, a region which has had comparatively high COVID deaths.

  const filtered = data.filter(d => d.registrationoroccurrence === "Occurrences" && d.week <= 10);
  const total_deaths = sum(filtered, d => d["cause-of-death"] === "all-causes" ? d.v4_0 : 0);
  return rollup(filtered, v => sum(v, d => d["cause-of-death"] === "all-causes" ? d.v4_0 : 0) / total_deaths, d => d.geography, d => d.placeofdeath);
}

function updateTable(settings, data) {

  const summary = rollup(data, v => {
    const all = sum(v, d => d["cause-of-death"] === "all-causes" ? d.v4_0 : 0);
    const covid = sum(v, d => d["cause-of-death"] === "covid-19" ? d.v4_0 : 0);
    const notcovid = all - covid;
    return {
      covid,
      notcovid,
      baseline: sum(v, d => d["cause-of-death"] === "all-causes" ? d.fiveyearaverage : 0),
    };
  }, d => d.placeofdeath);

  const table = select("#table").text("").append("table")
      .attr("class", "table shiny-table table-striped spacing-s");
  {
    const tr = table.append("thead").append("tr");
    ["Place of death", "All causes", "COVID-19", "COVID-19 not mentioned", "Five year average", "Excess deaths", "non-COVID excess"].forEach((d, i) => {
      tr.append("th").classed("right", i > 0).text(d);
    });
  }
  const tbody = table.append("tbody");
  const total = {covid: 0, notcovid: 0, baseline: 0};
  PLACES.forEach(place => {
    const d = summary.get(place);
    const all = d.covid + d.notcovid;
    const tr = tbody.append("tr");
    tr.append("td").text(place);
    tr.append("td").classed("right", true).text(formatNumber(all));
    tr.append("td").classed("right", true).text(formatNumber(d.covid));
    tr.append("td").classed("right", true).text(formatNumber(d.notcovid));
    tr.append("td").classed("right", true).text(formatNumber(d.baseline));
    tr.append("td").classed("right", true).text(formatNumber(all - d.baseline));
    tr.append("td").classed("right", true).text(formatNumber(d.notcovid - d.baseline));
    total.covid += d.covid;
    total.notcovid += d.notcovid;
    total.baseline += d.baseline;
  });
  {
    const d = total;
    const all = d.covid + d.notcovid;
    const tr = tbody.append("tr");
    tr.append("td").text("Total");
    tr.append("td").classed("right", true).text(formatNumber(all));
    tr.append("td").classed("right", true).text(formatNumber(d.covid));
    tr.append("td").classed("right", true).text(formatNumber(d.notcovid));
    tr.append("td").classed("right", true).text(formatNumber(d.baseline));
    tr.append("td").classed("right", true).text(formatNumber(all - d.baseline));
    tr.append("td").classed("right", true).text(formatNumber(d.notcovid - d.baseline));
  }
}

function updateChart(settings, data) {

  const chartMargin = {top: 50, right: 5, bottom: 25, left: 5};
  const chartHeight = 200;
  const chartCount = PLACES.length + 1;

  const margin = {top: 50, right: 0, bottom: 30, left: 70};
  const height = (chartHeight + chartMargin.top + chartMargin.bottom) * chartCount;

  const wrapperSvg = select("#by_place_of_death_plot").text("").append("svg")
      .attr("height", height + margin.top + margin.bottom);

  const width = select("#by_place_of_death_plot").property("clientWidth") - margin.left - margin.right;
  const chartWidth = width - chartMargin.left - chartMargin.right;
  const leftOffset = -60;

  const svg = wrapperSvg.attr("width", width + margin.left + margin.right)
    .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const timeDomain = extent(data, d => d.date);
  timeDomain[1] = utcDay.offset(timeDomain[1], 7);
  let maxDeaths = 0;
  let minExcess = 0;
  let maxExcess = 0;
  let minTotalExcess = 0;
  let maxTotalExcess = 0;
  let maxTotalDeaths = 0;

  const byPlaceOfDeathByWeek = rollup(data, v => {
    const all = sum(v, d => d["cause-of-death"] === "all-causes" ? d.v4_0 : 0);
    const covid = sum(v, d => d["cause-of-death"] === "covid-19" ? d.v4_0 : 0);
    const notcovid = all - covid;
    const baseline = sum(v, d => d["cause-of-death"] === "all-causes" ? d.fiveyearaverage : 0);
    const excess = covid + notcovid - baseline;
    maxDeaths = Math.max(maxDeaths, all, baseline);
    minExcess = Math.min(minExcess, excess);
    maxExcess = Math.max(maxExcess, excess);
    return {
      covid,
      notcovid,
      baseline,
      excess,
    };
  }, d => d.placeofdeath, d => formatDate(d.date));
  const totalByWeek = rollup(data, v => {
    const all = sum(v, d => d["cause-of-death"] === "all-causes" ? d.v4_0 : 0);
    const covid = sum(v, d => d["cause-of-death"] === "covid-19" ? d.v4_0 : 0);
    const notcovid = all - covid;
    const baseline = sum(v, d => d["cause-of-death"] === "all-causes" ? d.fiveyearaverage : 0);
    const excess = covid + notcovid - baseline;
    maxTotalDeaths = Math.max(maxTotalDeaths, all, baseline);
    minTotalExcess = Math.min(minTotalExcess, excess);
    maxTotalExcess = Math.max(maxTotalExcess, excess);
    return {
      covid,
      notcovid,
      baseline,
      excess,
    };
  }, d => formatDate(d.date));

  {
    const dx = 16;
    const padding = 20;
    let x = 0;
    const key = svg.append("g");
    key.append("rect")
        .attr("class", "covid")
        .attr("x", x)
        .attr("width", dx)
        .attr("height", dx);
    x += dx + 5;
    x += key.append("text").attr("x", x).attr("dy", "1em").text("COVID-19").node().getComputedTextLength() + padding;
    key.append("rect")
        .attr("class", "notcovid")
        .attr("x", x)
        .attr("width", dx)
        .attr("height", dx)
    x += dx + 5;
    x += key.append("text").attr("x", x).attr("dy", "1em").text("COVID-19 not mentioned").node().getComputedTextLength() + padding;

    key.append("line")
        .attr("class", "baseline")
        .attr("y1", 10)
        .attr("y2", 10)
        .attr("x1", x)
        .attr("x2", x + dx);
    x += dx + 5;
    x += key.append("text").attr("x", x).attr("dy", "1em").text("Five year average").node().getComputedTextLength();

    key.attr("transform", `translate(${leftOffset + 5}, -30)`);
  }

  const place = svg.selectAll(".place")
      .data(["Total"].concat(PLACES))
    .enter().append("g")
      .attr("class", "place")
      .attr("transform", (d, i) => `translate(${chartMargin.left}, ${i * height / chartCount + chartMargin.top})`);

  place.append("text")
      .attr("class", "chart-title")
      .attr("transform", `translate(${leftOffset}, -20)`)
      .text(String);

  const xScale = scaleUtc().domain(timeDomain).rangeRound([0, chartWidth]);
  const yScale = scaleLinear().domain(settings.plot_type === "Total deaths" ? [0, maxDeaths] : [minExcess, maxExcess]).range([chartHeight, 0]);
  const yScaleTotal = scaleLinear().domain(settings.plot_type === "Total deaths" ? [0, maxTotalDeaths] : [minTotalExcess, maxTotalExcess]).range([chartHeight, 0]);

  const yAxis = axisLeft(yScale)
      .ticks(5);
  const yGrid = axisLeft(yScale)
      .ticks(5)
      .tickSize(-chartWidth);

  const yAxisTotal = axisLeft(yScaleTotal)
      .ticks(5);
  const yGridTotal = axisLeft(yScaleTotal)
      .ticks(5)
      .tickSize(-chartWidth);

  const xAxis = axisBottom(xScale)
      .ticks(utcMonth.every(1));
  const xGrid = axisBottom(xScale)
      .ticks(utcMonth.every(1))
      .tickSize(-chartHeight);

  place.each(function(place, i) {

    select(this).append("g")
        .attr("class", "y-grid")
        .call(place === "Total" ? yGridTotal : yGrid)
        .call(g => g.selectAll(".tick text").remove())
        .call(g => g.selectAll(".domain").remove());

    select(this).append("g")
        .attr("class", "x-grid")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(xGrid)
        .call(g => g.selectAll(".tick text").remove())
        .call(g => g.selectAll(".domain").remove());

    select(this).append("g")
        .attr("class", "y-axis")
        .call(place === "Total" ? yAxisTotal : yAxis)
        .call(g => g.selectAll(".tick line").remove())
        .call(g => g.selectAll(".domain").remove());

    select(this).append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${leftOffset},${chartHeight/2})rotate(-90)`)
        .attr("dy", "1em")
        .text("Deaths");

    select(this).append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(xAxis);

    const byWeek = place === "Total" ? totalByWeek : byPlaceOfDeathByWeek.get(place);
    const bars = Array.from(byWeek.entries()).sort((a, b) => {
      return a[0] < b[0] ? -1 : 1;
    });
    bars.forEach(d => {
      const date = parseDate(d[0]);
      d.width = xScale(utcDay.offset(date, 7)) - xScale(date) - 1;
    });

    const bar = select(this).selectAll(".bar")
        .data(bars)
      .enter()
        .append("g")
          .attr("class", "bar")
          .attr("transform", d => `translate(${xScale(parseDate(d[0]))})`);

    const y = place === "Total" ? yScaleTotal : yScale;
    if (settings.plot_type === "Total deaths") {
      bar
          .append("rect")
            .attr("class", "notcovid")
            .attr("width", d => d.width)
            .attr("y", d => Math.min(y(0), y(d[1].notcovid)))
            .attr("height", d => Math.abs(y(d[1].notcovid) - y(0)))
          .append("title")
            .text(d => formatNumber(d[1].notcovid));
      bar
          .append("rect")
            .attr("class", "covid")
            .attr("width", d => d.width)
            .attr("y", d => Math.min(y(d[1].notcovid), y(d[1].covid + d[1].notcovid)))
            .attr("height", d => Math.abs(y(d[1].covid) - y(0)))
          .append("title")
            .text(d => formatNumber(d[1].covid));
      bar
          .append("line")
            .attr("class", "baseline")
            .attr("x2", d => d.width)
            .attr("y1", d => y(d[1].baseline))
            .attr("y2", d => y(d[1].baseline));
    } else {
      bar
          .append("rect")
            .attr("class", "excess")
            .attr("width", d => d.width)
            .attr("y", d => Math.min(y(0), y(d[1].excess)))
            .attr("height", d => Math.abs(y(d[1].excess) - y(0)))
          .append("title")
            .text(d => formatNumber(d[1].excess));
    }
  });

}

function updateTableCaption(settings) {
  const stop_date_inclusive = utcDay.offset(settings.stop_date, 6);
  select("#table_caption").text(`Table of COVID and non-COVID deaths (${settings.dataset}) within ${settings.area} by place of death from ${formatDate(settings.start_date)} till ${formatDate(stop_date_inclusive)} (inclusive), with excess deaths calculated against a five year average. In accordance with the ONS, due to the impact of coronavirus, the five year average being used as a baseline in 2021 is the same as that for 2020, and runs from 2015 to 2019.`);
}
