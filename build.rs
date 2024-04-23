use std::process::Command;
use dotenv_build::output;

fn main() {
    let config = dotenv_build::Config {
        filename: std::path::Path::new(".env"),
        recursive_search: false,
        fail_if_missing_dotenv: true,
        ..Default::default()
    };

    output(config).unwrap();

    Command::new("./build-client.sh").output().expect("Run client build");
    println!("cargo:rerun-if-changed=client");

    embuild::espidf::sysenv::output();
}
