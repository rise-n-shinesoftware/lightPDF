#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod license;

use tauri::State;
use std::sync::{Mutex};
use license::{validate_license, save_license_to_keyring, get_license_from_keyring, remove_license_from_keyring};

use pdfium_render::prelude::*;
use base64::{engine::general_purpose, Engine as _};

struct AppState {
    is_licensed: Mutex<bool>,
}

#[tauri::command]
fn activate_license(state: State<AppState>, key: String, email: String, first_name: String, last_name: String) -> Result<bool, String> {
    let is_valid = validate_license(&key, &email, &first_name, &last_name);
    
    if is_valid {
        let mut licensed = state.is_licensed.lock().unwrap();
        *licensed = true;
        
        // Persist to OS Keychain
        if let Err(e) = save_license_to_keyring(&key) {
            eprintln!("Failed to save to keyring: {}", e);
        }
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
fn check_license_status(state: State<AppState>) -> bool {
    let licensed = state.is_licensed.lock().unwrap();
    *licensed
}

#[tauri::command]
fn remove_license(state: State<AppState>) -> Result<(), String> {
    if let Err(e) = remove_license_from_keyring() {
        // Log the error but proceed to update the state, so the UI reflects the change.
        eprintln!("Failed to remove license from keyring: {}", e);
    }
    let mut licensed = state.is_licensed.lock().unwrap();
    *licensed = false;
    Ok(())
}

fn init_pdfium(app: &tauri::AppHandle) -> Result<Pdfium, String> {
    let res_dir = app.path_resolver().resource_dir().unwrap_or_default();
    let res_dir_str = res_dir.to_string_lossy().into_owned();
    let res_src_tauri = res_dir.join("src-tauri").to_string_lossy().into_owned();

    let pdfium_bindings = Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path(&res_dir_str))
        .or_else(|_| Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path(&res_src_tauri)))
        .or_else(|_| Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path("./")))
        .or_else(|_| Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path("../")))
        .or_else(|_| Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path("./src-tauri/")))
        .or_else(|_| Pdfium::bind_to_system_library())
        .map_err(|e| format!("Failed to bind to Pdfium library: {:?}. If you see Error 127, your pdfium.dll is too old. Please download build 6363 or newer.", e))?;
    Ok(Pdfium::new(pdfium_bindings))
}

#[tauri::command]
fn read_image_file(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("Failed to read image file: {}", e))?;
    Ok(general_purpose::STANDARD.encode(&bytes))
}

#[tauri::command]
fn get_pdf_page_count(app: tauri::AppHandle, path: String) -> Result<usize, String> {
    let pdfium = init_pdfium(&app)?;

    let document = pdfium
        .load_pdf_from_file(&path, None)
        .map_err(|e| format!("Failed to load PDF for page count: {}", e))?;

    Ok(document.pages().len() as usize)
}
#[tauri::command]
fn render_pdf_page(
    app: tauri::AppHandle,
    path: String,
    page_index: usize,
) -> Result<String, String> {
    let pdfium = init_pdfium(&app)?;

    let document = pdfium
        .load_pdf_from_file(&path, None)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;

    let page = document
        .pages()
        .get(page_index as u16)
        .map_err(|_| "Page number does not exist.".to_string())?;

    // Render page to a bitmap with a reasonable default width
    let bitmap = page
        .render_with_config(
            &PdfRenderConfig::new().set_target_width(1200)
        )
        .map_err(|e| format!("Failed to render page: {}", e))?;

    // Encode the bitmap as a PNG bytestream
    let image = bitmap.as_image();
    let mut png_data: Vec<u8> = Vec::new();
    image.write_to(&mut std::io::Cursor::new(&mut png_data), image::ImageFormat::Png)
        .map_err(|e| format!("Failed to encode page to PNG: {}", e))?;

    // Return the PNG data as a Base64 string for easy display in the frontend
    Ok(general_purpose::STANDARD.encode(&png_data))
}

#[tauri::command]
fn render_pdf_thumbnail(
    app: tauri::AppHandle,
    path: String,
    page_index: usize,
) -> Result<String, String> {
    let pdfium = init_pdfium(&app)?;

    let document = pdfium.load_pdf_from_file(&path, None).map_err(|e| format!("Failed to load PDF: {}", e))?;
    let page = document.pages().get(page_index as u16).map_err(|_| "Page number does not exist.".to_string())?;

    // Render a much smaller bitmap for the preview pane
    let bitmap = page
        .render_with_config(&PdfRenderConfig::new().set_target_width(300))
        .map_err(|e| format!("Failed to render thumbnail: {}", e))?;

    let image = bitmap.as_image();
    let mut png_data: Vec<u8> = Vec::new();
    image.write_to(&mut std::io::Cursor::new(&mut png_data), image::ImageFormat::Png)
        .map_err(|e| format!("Failed to encode thumbnail to PNG: {}", e))?;

    Ok(general_purpose::STANDARD.encode(&png_data))
}

fn main() {
    // On startup, check if a license key is already stored and valid.
    let initial_license_status = match get_license_from_keyring() {
        Ok(key) => !key.is_empty(), // If a key exists and is not empty, we consider it licensed.
        Err(_) => false, // If there's an error (e.g., entry not found), not licensed.
    };
    tauri::Builder::default()
        .manage(AppState {
            is_licensed: Mutex::new(initial_license_status),
        })
        .invoke_handler(tauri::generate_handler![
            activate_license, check_license_status, remove_license, get_pdf_page_count, 
            render_pdf_page, read_image_file, render_pdf_thumbnail
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}