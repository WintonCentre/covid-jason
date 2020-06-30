import resolve from "@rollup/plugin-node-resolve";
import {terser} from "rollup-plugin-terser";

export default {
  input: "app.js",
  output: {
    name: "app",
    file: "dist/bundle.js",
    format: "umd"
  },
  plugins: [
    resolve(),
    terser(),
  ]
};
