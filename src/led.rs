use anyhow::Result;
use esp_idf_svc::hal::gpio::{Gpio21, Output, PinDriver, Pins};

pub struct Led {
    pin21: PinDriver<'static, Gpio21, Output>
}

impl Led {
    pub fn load(pins: Pins) -> Result<Self> {
        let pin21 = PinDriver::output(pins.gpio21)?;
        let mut ret = Self {
            pin21,
        };
        ret.off()?;
        Ok(ret)
    }
    
    pub fn on(&mut self) -> Result<()> {
        self.pin21.set_low()?;
        Ok(())
    }
    
    pub fn off(&mut self) -> Result<()> {
        self.pin21.set_high()?;
        Ok(())
    }
}
