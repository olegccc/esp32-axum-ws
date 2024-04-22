# Rust for ESP32 with Axum and Websockets

This repository provides base but working functionality for ESP32 board with Rust environment
based on `esp-rs` project, where it runs fully functional web server based on Axum web framework
with the support of Websockets. Axum by itself is based on Tokio.rs asynchronous runtime. 

Once you have built and run the code, it opens a web server page where you can manage state of a LED:
turn it on and off and query its status. All the communication is done through a Websocket channel.

The `client` folder contains basic but fully functional React-based web application that knows
to open Websocket channel and use it to communicate with the device.

Tested on ESP32S3 dev board (Seeed Studio XIAO ESP32S3). Note that the configured LED pin number (21) triggers physical
LED on this board. This will work on any ESP32 board but you will need to know and adjust the pin number for your board.

I don't see any reason why it may not work on any other ESP32 board with enough flash memory
(its image size is about 2.4MB and current partition layout is set to have at least 3MB flash memory).

In general, I think it is the best of all known ways to build a secure, reliable web application that requires intensive communication
with ESP32 device. It is enough to write only web interface, without the need of developing mobile applications
(however Websockets work perfectly with Android and iOS native apps, Flutter apps etc).

The fact that it is based on Tokio and Rust opens all the existing ecosystem of Rust libraries for you.
You can write tests and debug your app on desktop, before moving to mobile device. 

## Install

Rust-ESP installation flow is described here, you need to follow all the required steps there:
https://github.com/esp-rs/rust-build

## Prepare

Copy `.env.default` to `.env` and change default values to the actual ones.

To prepare the build environment, execute the following command each time you open a terminal window:

`. ~/export-esp.sh`

## Build

On the first build, and also on each client change, run

`cd client && yarn && yarn build`

To build the project, use the following command:

`cargo build`

To run the project, use the following command:

`cargo run`

## Reference links

* Rust-ESP installation process: https://github.com/esp-rs/rust-build
* AXUM web framework: https://github.com/tokio-rs/axum
* Seeed Studio XIAO ESP32S3 https://wiki.seeedstudio.com/xiao_esp32s3_getting_started/
* Tokio.rs asynchronous runtime documentation https://tokio.rs/tokio/tutorial
* Awesome ESP Rust https://github.com/esp-rs/awesome-esp-rust
* esp32-s3-rust-axum-example (used as a prototype for this project) https://github.com/aedm/esp32-s3-rust-axum-example/
