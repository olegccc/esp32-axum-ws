use anyhow::Result;

#[derive(Debug)]
pub struct Config {
    pub wifi_ssid: &'static str,
    pub wifi_pass: &'static str,
}

impl Config {
    pub fn load() -> Result<Self> {
        Ok(Self {
            wifi_ssid: env!("WIFI_SSID"),
            wifi_pass: env!("WIFI_PASS"),
        })
    }
}
