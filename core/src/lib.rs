use wasm_bindgen::prelude::*;
use uiua::{Uiua, Value};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format!($($t)*)))
}

#[wasm_bindgen]
pub fn run_algo(code: &str, input_r: f64, input_x: f64) -> Vec<f64> {
    // 1. Create a safe Uiua instance (no file system access)
    let mut uiua = Uiua::with_safe_sys();

    // 2. Push arguments onto the stack (Uiua is stack-based!)
    uiua.push(input_x);
    uiua.push(input_r);

    // 3. Run the code
    match uiua.run_str(code) {
        Ok(_) => {
            // 4. Pop the result
            match uiua.pop("result") {
                Ok(val) => {
                    // Extract f64 data from the Value, regardless of shape
                    let nums = extract_nums(&val);
                    console_log!("Uiua returned {} numbers", nums.len());
                    nums
                },
                Err(e) => {
                    console_log!("Uiua pop error: {}", e);
                    vec![]
                }
            }
        },
        Err(e) => {
            console_log!("Uiua run error: {}", e);
            vec![]
        }
    }
}

/// Extract all numeric values from a Uiua Value as a flat Vec<f64>
fn extract_nums(val: &Value) -> Vec<f64> {
    match val {
        Value::Num(arr) => {
            // Use elements() iterator to access the data
            arr.elements().copied().collect()
        },
        Value::Byte(arr) => {
            // Convert bytes to f64
            arr.elements().map(|&b| b as f64).collect()
        },
        _ => {
            console_log!("Unsupported value type for numeric extraction");
            vec![]
        }
    }
}
