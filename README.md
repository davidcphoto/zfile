# zfile README

Vscode extension to view mainframe files with copybook defined fields.

## Features

Read mainframe files with:

- Alphanumeric fields
- Numeric fields
- Signed numeric fields
- Comp-3 numeric fields-

> Tip: other numeric fields will be added soon.

## Requirements

- Zowe explorer

## Extension Settings

This extension contributes the following settings:

* `zFile.NumberOfRecords`: Number os records read from a file.
* `zFile.Copybooks.NumberOfPreviousCopybooks`: Number of copybooks previously selected to be represented when the file is opened. Default value of 5 and max value of 20.
* `zFile.Copybooks.ListOfPreviousCopybooks`: List of copybooks previously selected from the mainframe.
* `zFile.Copybooks.ListOfPreviousWorksationCopybooks`: List of copybooks previously selected from the workstation.

>Info: The Number of Previous Copybooks is the same for the 2 lists

## Known Issues

Numerics comp-3

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of zFile
