use dotenv_build::output;

fn main() {
    let config = dotenv_build::Config {
        filename: std::path::Path::new(".env"),
        recursive_search: false,
        fail_if_missing_dotenv: true,
        ..Default::default()
    };

    output(config).unwrap();

    embuild::espidf::sysenv::output();
}
