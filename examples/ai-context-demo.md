# AI Context with Outputs - Demo

This example demonstrates how AI cells can now see and analyze cell outputs, not just source code.

## Setup

1. Start Anode with OpenAI configured:
```bash
# Copy environment and add your OpenAI API key
cp .env.example .env
# Edit .env to add: OPENAI_API_KEY=sk-your-key-here

# Start services
pnpm dev
# In another terminal: NOTEBOOK_ID=your-notebook-id pnpm dev:kernel
```

## Demo Workflow

### Step 1: Create Data with Outputs

**Code Cell 1:**
```python
import pandas as pd
import numpy as np

# Create sample dataset
data = {
    'name': ['Alice', 'Bob', 'Charlie', 'Diana'],
    'age': [25, 30, 35, 28],
    'salary': [50000, 75000, 90000, 65000],
    'department': ['Engineering', 'Marketing', 'Engineering', 'Sales']
}

df = pd.DataFrame(data)
print(f"Created dataset with {len(df)} rows and {len(df.columns)} columns")
print(f"Average salary: ${df['salary'].mean():,.2f}")

# Display the data
df
```

**Expected Output:**
```
Created dataset with 4 rows and 4 columns
Average salary: $70,000.00

      name  age  salary   department
0    Alice   25   50000  Engineering
1      Bob   30   75000    Marketing
2  Charlie   35   90000  Engineering
3    Diana   28   65000        Sales
```

### Step 2: Perform Analysis with Outputs

**Code Cell 2:**
```python
# Department analysis
dept_stats = df.groupby('department').agg({
    'salary': ['mean', 'count'],
    'age': 'mean'
}).round(2)

print("Department Statistics:")
print(dept_stats)

# Find highest and lowest paid employees
highest_paid = df.loc[df['salary'].idxmax()]
lowest_paid = df.loc[df['salary'].idxmin()]

print(f"\nHighest paid: {highest_paid['name']} (${highest_paid['salary']:,})")
print(f"Lowest paid: {lowest_paid['name']} (${lowest_paid['salary']:,})")
```

**Expected Output:**
```
Department Statistics:
            salary       age
              mean count mean
department               
Engineering  70000     2 30.0
Marketing    75000     1 30.0
Sales        65000     1 28.0

Highest paid: Charlie ($90,000)
Lowest paid: Alice ($50,000)
```

### Step 3: AI Analysis with Full Context

**AI Cell:**
```
Analyze the employee data above and provide insights. What patterns do you see in the salary and demographic data? Suggest three specific visualizations that would be most helpful for understanding this dataset.
```

**What the AI Now Sees:**

The AI receives context including:
- **Source code** from both previous cells
- **Text outputs** showing dataset summary statistics
- **DataFrame displays** with actual employee data
- **Analysis results** showing department breakdowns
- **Specific findings** like highest/lowest paid employees

**Expected AI Response:**
Based on the employee data analysis, I can see several interesting patterns:

**Key Insights:**
1. **Engineering Premium**: Engineering has the highest average salary ($70,000) despite having employees across different age ranges
2. **Experience vs. Pay**: Charlie (35, Engineering) earns the most ($90,000), suggesting experience matters in technical roles
3. **Department Size**: Engineering has 2 employees (50%), while Marketing and Sales each have 1

**Recommended Visualizations:**

1. **Salary by Department Bar Chart**:
```python
import matplotlib.pyplot as plt
df.groupby('department')['salary'].mean().plot(kind='bar', title='Average Salary by Department')
plt.ylabel('Average Salary ($)')
plt.xticks(rotation=45)
plt.show()
```

2. **Age vs Salary Scatter Plot**:
```python
plt.scatter(df['age'], df['salary'], c=['red' if dept=='Engineering' else 'blue' if dept=='Marketing' else 'green' for dept in df['department']])
plt.xlabel('Age')
plt.ylabel('Salary ($)')
plt.title('Age vs Salary by Department')
plt.show()
```

3. **Department Composition Pie Chart**:
```python
df['department'].value_counts().plot(kind='pie', title='Employee Distribution by Department', autopct='%1.1f%%')
plt.show()
```

These visualizations will help identify salary trends, experience correlations, and team composition patterns.

### Step 4: Error Analysis Context

**Code Cell 3:**
```python
# Intentional error for demo
result = df['salary'].sum() / df['nonexistent_column'].count()
print(f"Average calculation: {result}")
```

**Expected Error Output:**
```
KeyError: 'nonexistent_column'
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
KeyError: 'nonexistent_column'
```

**AI Cell for Debugging:**
```
I got an error in the previous cell. Can you help me fix it and explain what went wrong?
```

**AI Response with Error Context:**
I can see the error in your previous cell. The issue is a `KeyError: 'nonexistent_column'` which occurred because you're trying to access a column that doesn't exist in your DataFrame.

**Problem**: 
```python
result = df['salary'].sum() / df['nonexistent_column'].count()
```

**Issue**: `'nonexistent_column'` is not a valid column name in your DataFrame. Your DataFrame has columns: `['name', 'age', 'salary', 'department']`.

**Fixed Code**:
```python
# If you want to calculate average salary:
average_salary = df['salary'].mean()
print(f"Average salary: ${average_salary:,.2f}")

# Or if you want total salary divided by employee count:
result = df['salary'].sum() / len(df)
print(f"Total salary divided by employee count: ${result:,.2f}")
```

The AI was able to:
- See the exact error message and traceback
- Identify the problematic column name
- Reference the actual DataFrame structure from previous cells
- Provide a corrected solution based on the data context

## Key Benefits Demonstrated

1. **Rich Context**: AI sees both code and its actual outputs
2. **Data Awareness**: AI understands the structure and content of your data
3. **Error Debugging**: AI can analyze actual error messages and tracebacks
4. **State Understanding**: AI knows what variables exist and their current values
5. **Progressive Analysis**: Each AI response builds on previous execution results

## Technical Implementation

This functionality works through:
- Enhanced `NotebookContext` interface including outputs
- Filtering to include `text/plain` and `text/markdown` outputs
- Smart formatting of different output types (stream, error, rich)
- Comprehensive test coverage ensuring reliability

## Next Steps

Try this workflow in your own notebook to experience the enhanced AI context awareness!