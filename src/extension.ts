// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { readFileSync } from "fs";
import path = require("path");
import { TextDecoder } from "util";
import {
  languages,
  ExtensionContext,
  workspace,
  TextDocument,
  Position,
  Range,
  DocumentSelector,
  Disposable,
  TextEdit,
  window,
  Uri,
} from "vscode";

const prettyDiffLog = window.createOutputChannel("Pretty Diff");
const editor = workspace.getConfiguration("editor");
const config = workspace.getConfiguration("pretty-formatter");
const prettydiff = require("prettydiff");

let formatterHandler: undefined | Disposable;
let rangeFormatterHandler: undefined | Disposable;

/**
 * Dispose formatters
 */
function disposeHandlers() {
  if (formatterHandler) {
    formatterHandler.dispose();
  }
  if (rangeFormatterHandler) {
    rangeFormatterHandler.dispose();
  }
  formatterHandler = undefined;
  rangeFormatterHandler = undefined;
}

/**
 * Build formatter selectors
 */
const selectors = [
  "vtl", //Apache Velocity
  "aspx", //ASP Inline Expression
  "cfm", //CFML (ColdFusion Markup Language)
  "dust", //Dust.js
  "html-eex", //EEX Elixir Templates
  "eex", //EEX Elixir Templates
  "ejs", //EJS (Embedded JavaScript) Templates
  "erb", //ERB (Embedded Ruby)
  "ftl", //FreeMarker
  "genshi", //Genshi
  "handlebars", //Handlebars
  "htl", //HTL (HTML Templating Language)
  "html", //HTML
  "jinja", //Jinja
  "liquid", //Liquid
  "mustache", //Mustache
  "nunjucks", //Nunjucks
  "SilverStripe", //SilverStripe
  "spacebars", //Spacebars templates
  "tpl", //Underscore Templates (TPL)
  "twig", //Twig
  "leaf", //Vapor Leaf
  "vash", //Vash
  "volt", //Volt
  "xml", //XML
  "xslt", //XSLT
  "flow", //Flow
  "js", //JavaScript
  "javascript", //JavaScript
  "javascriptreact", //JavaScript React
  "typescript", //Typescript
  "typescriptreact", //Typescript React
  "json", //JSON
  "jsonc", //JSONC
  "qml", //QML
  "jsx", //React JSX
  "tss", //TSS (Titanium Style Sheets)
  "tsx", //TSX
  "ts", //TypeScript
  "css", //CSS
  "less", //LESS
  "scss", //SCSS
  "sass", //Sass
];

const prettyDiff = async (document: TextDocument, range: Range) => {
  const result = [];
  let output = "";
  let options = prettydiff.options;

  let tabSize = editor.tabSize;

  if (config.indentSize > 0) {
    tabSize = config.indentSize;
  }

  let fileConfig: { [key: string]: any } = {};
  if (config.config !== "none") {
    let workspaceFolder = workspace.getWorkspaceFolder(document.uri);

    if (workspaceFolder) {
      // Workspace folder: /home/me/my-project
      const filepath = Uri.joinPath(workspaceFolder.uri, config.config);
      prettyDiffLog.appendLine(
        `Using the following configuration file: ${filepath}`
      );
      const data = (await workspace.fs.readFile(filepath)).toString();
      fileConfig = JSON.parse(data);
    }
  }

  options.brace_line = fileConfig.brace_line ?? config.braceLine;
  options.brace_padding = fileConfig.brace_padding ?? config.bracePadding;
  options.brace_style = fileConfig.brace_style ?? config.braceStyle;
  options.braces = fileConfig.braces ?? config.braces;
  options.comment_line = fileConfig.comment_line ?? config.commentLine;
  options.comments = fileConfig.comments ?? config.comments;
  options.compressed_css = fileConfig.compressed_css ?? config.compressedCss;
  options.correct = fileConfig.correct ?? config.correct;
  options.css_insert_lines =
    fileConfig.css_insert_lines ?? config.cssInsertLines;
  options.else_line = fileConfig.else_line ?? config.elseLine;
  options.end_comma = fileConfig.end_comma ?? config.endComma;
  options.force_attribute = fileConfig.force_attribute ?? config.forceAttribute;
  options.force_indent = fileConfig.force_indent ?? config.forceIndent;
  options.format_array = fileConfig.format_array ?? config.formatArray;
  options.format_object = fileConfig.format_object ?? config.formatObject;
  options.function_name = fileConfig.function_name ?? config.functionName;
  options.indent_level = fileConfig.indent_level ?? config.indentLevel;
  options.indent_size = fileConfig.indent_size ?? tabSize;
  options.method_chain = fileConfig.method_chain ?? config.methodChain;
  options.never_flatten = fileConfig.never_flatten ?? config.neverFlatten;
  options.new_line = fileConfig.new_line ?? config.newLine;
  options.no_case_indent = fileConfig.no_case_indent ?? config.noCaseIndent;
  options.no_lead_zero = fileConfig.no_lead_zero ?? config.noLeadZero;
  options.object_sort = fileConfig.object_sort ?? config.objectSort;
  options.preserve = fileConfig.preserve ?? config.preserve;
  options.preserve_comment =
    fileConfig.preserve_comment ?? config.preserveComment;
  options.quote_convert = fileConfig.quote_convert ?? config.quoteConvert;
  options.space = fileConfig.space ?? config.space;
  options.space_close = fileConfig.space_close ?? config.spaceSlose;
  options.styleguide = fileConfig.styleguide ?? config.styleguide;
  options.tag_merge = fileConfig.tag_merge ?? config.tagMerge;
  options.tag_sort = fileConfig.tag_sort ?? config.tagSort;
  options.ternary_line = fileConfig.ternary_line ?? config.ternaryLine;
  options.unformatted = fileConfig.unformatted ?? config.unformatted;
  options.variable_list = fileConfig.variable_list ?? config.variableList;
  options.vertical = fileConfig.vertical ?? config.vertical;
  options.wrap = fileConfig.wrap ?? config.wrap;

  options.source = document.getText(range);
  options.mode = "beautify";

  output = prettydiff();

  options.end = 0;
  options.start = 0;

  result.push(TextEdit.replace(range, output));
  return result;
};

export function activate(context: ExtensionContext) {
  interface Selectors {
    rangeLanguageSelector: DocumentSelector;
    languageSelector: DocumentSelector;
  }

  let enabledLanguages: string[] = [];
  if (config.enableLanguages.length > 0) {
    enabledLanguages = config.enableLanguages;
  } else {
    enabledLanguages = selectors.filter(function (el) {
      return config.disableLanguages.indexOf(el) < 0;
    });
  }

  function registerFormatter() {
    disposeHandlers();

    prettyDiffLog.append(`cwd:  ${process.cwd()}`);

    for (let i in enabledLanguages) {
      rangeFormatterHandler = languages.registerDocumentRangeFormattingEditProvider(
        {
          scheme: "file",
          language: enabledLanguages[i],
        },
        {
          provideDocumentRangeFormattingEdits: function (
            document: TextDocument,
            range: Range
          ) {
            let end = range.end;

            if (end.character === 0) {
              end = end.translate(-1, Number.MAX_VALUE);
            } else {
              end = end.translate(0, Number.MAX_VALUE);
            }

            const rng = new Range(new Position(range.start.line, 0), end);
            return prettyDiff(document, rng);
          },
        }
      );

      formatterHandler = languages.registerDocumentFormattingEditProvider(
        {
          scheme: "file",
          language: enabledLanguages[i],
        },
        {
          provideDocumentFormattingEdits: function (document: TextDocument) {
            const start = new Position(0, 0);

            const end = new Position(
              document.lineCount - 1,
              document.lineAt(document.lineCount - 1).text.length
            );
            const rng = new Range(start, end);
            return prettyDiff(document, rng);
          },
        }
      );
    }
  }

  if (config.formatting) {
    registerFormatter();
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
