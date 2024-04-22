mod wifi;
mod config;
mod server;
mod led;

use esp_idf_svc::eventloop::EspSystemEventLoop;
use esp_idf_svc::hal::prelude::Peripherals;
use esp_idf_svc::sys;
use esp_idf_svc::log::EspLogger;
use esp_idf_svc::nvs::EspDefaultNvsPartition;
use esp_idf_svc::timer::EspTaskTimerService;
use log::{error, info};
use std::thread::sleep;
use esp_idf_svc::hal::reset;
use crate::config::Config;
use crate::led::Led;
use crate::server::run_server;
use crate::wifi::WifiConnection;

fn main() {
    info!("Starting main()");

    sys::link_patches();
    EspLogger::initialize_default();
    esp_idf_svc::io::vfs::initialize_eventfd(1).expect("Failed to initialize eventfd");

    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("Failed to build Tokio runtime");

    match rt.block_on(async { async_main().await }) {
        Ok(()) => info!("async_main() finished, reboot."),
        Err(err) => {
            error!("{err:?}");
            // Let them read the error message before rebooting
            sleep(std::time::Duration::from_secs(3));
        },
    }

    reset::restart();
}

async fn async_main() -> anyhow::Result<()> {
    info!("Got to async_main()");

    let config = Config::load()?;
    info!("Configuration:\n{config:#?}");

    let peripherals = Peripherals::take()?;
    let sys_loop = EspSystemEventLoop::take()?;
    let timer_service = EspTaskTimerService::new()?;
    let nvs = EspDefaultNvsPartition::take()?;
    let led = Led::load(peripherals.pins)?;

    let mut wifi = WifiConnection::new(
        peripherals.modem,
        sys_loop,
        timer_service,
        Some(nvs),
        &config,
    ).await?;

    tokio::try_join!(
        run_server(wifi.state.clone(), led),
        wifi.connect()
    )?;

    Ok(())
}
