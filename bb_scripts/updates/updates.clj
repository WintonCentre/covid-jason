#!/usr/bin/env bb

(ns updates.updates)
(require '[clojure.java.shell :refer [sh]]
         '[clojure.edn :as edn]
         '[clojure.string :as s])

(def last-line
  (-> (s/split-lines (slurp "data.csv"))
      last
      (s/split #",")))
(def data-week (edn/read-string (nth last-line 3)))
(def this-week (edn/read-string ((sh "date" "+%V") :out)))
(def fetch? (pos? (- data-week 51 this-week)))
