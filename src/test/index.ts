//
// PLEASE DO NOT MODIFY / DELETE UNLESS YOU KNOW WHAT YOU ARE DOING
//
// This file is providing the test runner to use when running extension tests.
// By default the test runner in use is Mocha based.
//
// You can provide your own test runner if you want to override it by exporting
// a function run(testsRoot: string, clb: (error: Error, failures?: number) => void): void
// that the extension host can call to run the tests. The test runner is expected to use console.log
// to report the results back to the caller. When the tests are finished, return
// a possible error to the callback or null if none.

import * as path from "path";
import { runTests } from "vscode-test";

async function go() {
  const extensionDevelopmentPath = path.resolve(__dirname, "../../../");
  const extensionTestsPath = path.resolve(__dirname, "./suite");

  /**
   * Basic usage
   */
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
  });
}

go();
