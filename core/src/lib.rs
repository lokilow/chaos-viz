use wasm_bindgen::prelude::*;
use uiua::Uiua;

#[wasm_bindgen]
pub fn run_algo(code: &str, input_r: f64, input_x: f64) -> Vec<f64> {
    // 1. Create a safe Uiua instance (no file system access)
    let mut uiua = Uiua::with_safe_sys();

    // 2. Push arguments onto the stack (Uiua is stack-based!)
    // We push x first, then r, depending on your Uiua function signature
    uiua.push(input_x);
    uiua.push(input_r);

    // 3. Run the code
    match uiua.run_str(code) {
        Ok(compiler) => {
            vec![1.0, 2.0 ,3.0]
            // 4. Pop the result (assumes your Uiua code leaves one array on stack)
            // match compiler.pop_nums() {
            //     Ok(vec) => vec,
            //     Err(_) => vec![] // Handle error gracefully or return empty
            // }
        },
        Err(e) => {
            // Log error to console if needed
            vec![]
        }
    }
}
