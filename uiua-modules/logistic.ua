# Expects: r, x on stack
# Returns: The orbit array

# Define the logistic map step: r * x * (1 - x)
Step ← ×⊃(×|1-)

# Create an array of 100 iterations
# We use 'scan' or 'iterate' here.
# For simplicity in this example, we just run 100 times.
⍥Step 100
