# unionstation_2020

Scratch pad for US

## Two runtimes:

### Browser

- All nodes loaded into svelte app 'Composer'
- Also editable in 'Node Creator' with Monaco Editor

### Node

- Flow is in package.json file for project
- Flow -> project with index.mjs file and all necessary classes / files
- UI runtime export optional

## Node Design

- All nodes inherit from main node classes
- Two properties inheriting from external classes for user interface
  - ui: User Interface for interfacing with the node
  - element: User Interface for the composer node canvas

## TODO

- [X] Wire creation
- [X] Element selection
- [ ] CRUD elements
- [ ] Node elements

## New Features

- [ ] Hold down ctrl to grab multiple endpoints and connect
- [ ] Change color on overlap