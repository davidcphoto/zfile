# zfile README

Vscode extension that add's a menu item to the Zowe Explorer extension allowing to view and edit mainframe fixed files (FB=) __flat files__.
Files will be showed in a grid defined by a copybook that can be loaded from the mainframe or your one workstation.

## Features

Read mainframe files with:

- [x] Alphanumeric fields.
- [x] Numeric fields.
- [x] Signed numeric fields.
- [x] Comp numeric fields.
- [ ] Comp-1 numeric fields.
- [ ] Comp-2 numeric fields.
- [x] Comp-3 numeric fields.
- [x] Comp-4 numeric fields.
- [x] Comp-5 numeric fields.
- [x] Binary numeric files.

> Tip: other numeric fields will be added soon.

## Requirements

- Zowe explorer
- zosmf connection

## Extension Settings

This extension contributes the following settings:

* `zFile.NumberOfRecords`: Maximum number os records read from a file.
* `zFile.Copybooks.NumberOfPreviousCopybooks`: Number of copybooks previously selected to be represented when the file is opened. Default value of 5 and max value of 20.
* `zFile.Copybooks.ListOfPreviousCopybooks`: List of copybooks previously selected from the mainframe.
* `zFile.Copybooks.ListOfPreviousWorksationCopybooks`: List of copybooks previously selected from the workstation.

>Tip: The Number of Previous Copybooks is the same for the 2 lists

## Known Issues

- Save action must be made on the provided menu.
- File mas be a fixed byte file.
- File's lrec must have the same size as the copybook definition.
- No redefined in the copybook.

## Release Notes


### 1.0.1

Added keywords to the extension.

### 1.0.0

Initial release of zFile
