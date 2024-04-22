use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use axum::extract::{Path, State, WebSocketUpgrade};
use axum::Router;
use axum::extract::ws::{Message, WebSocket};
use axum::http::{header, StatusCode};
use axum::response::IntoResponse;
use axum::routing::get;
use futures::SinkExt;
use include_dir::{Dir, File, include_dir};
use log::{error, info};
use crate::wifi::WifiState;
use futures::stream::StreamExt;
use serde::{Deserialize, Serialize};
use crate::led::Led;

struct SharedState {
    pub led_on: Mutex<bool>,
    pub led: Mutex<Led>,
}

static WWW_DIR: Dir = include_dir!("client/dist");

pub async fn run_server(_: Arc<WifiState>, led: Led) -> anyhow::Result<()> {
    let state = Arc::new(SharedState {
        led_on: Mutex::new(false),
        led: Mutex::new(led),
    });

    let addr = "0.0.0.0:80".parse::<SocketAddr>()?;
    let app = Router::new()
        .route("/", get(get_index))
        .route("/ws", get(get_ws))
        .route("/*path", get(get_path))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    info!("Server: listening on {addr:?}");
    Ok(axum::serve(listener, app.into_make_service()).await?)
}

async fn get_index() -> impl IntoResponse {
    get_path(Path("index.html".to_string())).await
}

async fn get_path(Path(path): Path<String>) -> impl IntoResponse {
    let file: Option<&File> = WWW_DIR.get_file(path);
    if let Some(file) = file {
        let ext = file.path().extension().unwrap().to_str().unwrap();
        info!("Got file type: {ext}");
        let content_type = match ext {
            "html" => "text/html",
            "css" => "text/css",
            "js" => "text/javascript",
            _ => "text/plain"
        };
        return (StatusCode::OK, [(header::CONTENT_TYPE, content_type)], file.contents_utf8().unwrap().to_string())
    } else {
        (StatusCode::NOT_FOUND, [(header::CONTENT_TYPE, "text/plain")], "Not Found".to_string())
    }
}

async fn get_ws(ws: WebSocketUpgrade, state: State<Arc<SharedState>>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_websocket(socket, state))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ServerMessageLedStatus {
    status: bool
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ServerMessagePing {}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
enum ServerMessage {
    LedStatus(ServerMessageLedStatus),
    Ping(ServerMessagePing)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ClientMessagePong {}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ClientMessageQueryLedStatus {}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ClientMessageSetLedStatus {
    status: bool
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
enum ClientMessage {
    SetLedStatus(ClientMessageSetLedStatus),
    QueryLedStatus(ClientMessageQueryLedStatus),
    Pong(ClientMessagePong)
}

async fn handle_websocket(socket: WebSocket, State(state): State<Arc<SharedState>>) {
    let (mut sender, mut receiver) = socket.split();
    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Text(text) => {
                if text == "ping" {
                    if let Err(e) = sender.send(Message::Text("pong".to_string())).await {
                        error!("Websocket: cannot send pong, {e}");
                    }
                    continue;
                }
                info!("Websocket: got message {text}");
                let request: Result<ClientMessage, _> = serde_json::from_str(text.as_str());
                if let Ok(message) = request {
                    match message {
                        ClientMessage::SetLedStatus(status) => {
                            {
                                let mut value = state.led_on.lock().unwrap();
                                *value = status.status;
                            }
                            info!("LED status {}", if status.status { "ON" } else { "OFF" });
                            let mut led = state.led.lock().unwrap();
                            if status.status {
                                led.on().unwrap();
                            } else {
                                led.off().unwrap();
                            }
                        }
                        ClientMessage::QueryLedStatus(_) => {
                            let message: ServerMessage = ServerMessage::LedStatus(ServerMessageLedStatus { status: *state.led_on.lock().unwrap() });
                            let response = serde_json::to_string(&message).unwrap();
                            if let Err(e) = sender.send(Message::Text(response)).await {
                                error!("Websocket: cannot send message, {e}")
                            }
                        }
                        ClientMessage::Pong(_) => {
                            info!("Websocket: pong")
                        }
                    }
                }
            }
            _ => {}
        }
    }
}
