import argparse
import re
from os import PathLike
from pathlib import Path

from openai import OpenAI

from llm.base import LLM


def read_api_key(api_file: 'PathLike' = None) -> str:
    api_file = api_file or Path(__file__).parent / "deepseek.apikey"
    assert api_file.exists(), f"API Key file not found at {api_file}"
    with api_file.open() as api_file:
        api_key = api_file.read().strip()
    return api_key


def setup(api_file=None) -> 'OpenAI.Client':
    api_key = read_api_key(api_file=api_file)

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com"
    )
    return client


def get_system_prompt():
    example1 = """Input: <code lang="python">
    import pandas as pd

    # Config the pandas dataframe to show in a specific format
    pd.set_option('display.max_columns', 10)

    # Read the dataframe
    df = pd.read_csv("data.csv")
    df2 = df[['b', 'a']]
    df3 = df2.groupby('b').mean()
    df3

    df3.plot()
    </code>
    <var>
    df3.plot()
    </var>

    Output:
    <myrefactoredcode>
    import pandas as pd
    pd.set_option('display.max_columns', 10)

    def compute_df3(file_path):
        df = pd.read_csv(file_path)
        df2 = df[['b', 'a']]
        new_df = df2.groupby('b').mean()
        return new_df

    def plot_df3(df):
        df.plot()  # (copilot[stateful])

    def test_compute_df3():
         # Try to get from the global state to verify the variable
        expected_df = globals()["df3"]
        # Obtain the expected result
        result = compute_df3(test_df)
        pd.testing.assert_frame_equal(result, expected_df)

    df3 = compute_df3("data.csv")
    plot_df3(df3)
    test_compute_df3()
    </myrefactoredcode>
    """

    example2 = """Input: <code lang="python">
    import pandas as pd
    import matplotlib.pyplot as plt

    # Load dataset
    df = pd.read_csv('data.csv')

    # Clean data
    df.dropna(inplace=True)

    # Feature engineering
    df['new_feature'] = df['feature1'] * df['feature2']

    # Aggregate data
    grouped_df = df.groupby('category').agg({'new_feature': 'sum', 'feature1': 'mean'})

    # Plot results
    plt.figure(figsize=(10,6))
    grouped_df['new_feature'].plot(kind='bar')
    plt.title('Sum of New Feature by Category')
    plt.show()
    </code>
    <var>
    grouped_df['new_feature'].plot(kind='bar')
    </var>

    Output:
    <myrefactoredcode>
    import pandas as pd
    import matplotlib.pyplot as plt

    def clean_and_aggregate_data(file_path):
        df = pd.read_csv(file_path)
        df.dropna(inplace=True)  # (copilot[stateful])
        df['new_feature'] = df['feature1'] * df['feature2']
        grouped_df = df.groupby('category').agg({'new_feature': 'sum', 'feature1': 'mean'})
        return grouped_df

    def plot_new_feature(grouped_df):
        plt.figure(figsize=(10,6))
        grouped_df['new_feature'].plot(kind='bar')
        plt.title('Sum of New Feature by Category')
        plt.show()  # (copilot[stateful])

    def test_clean_and_aggregate_data():
        expected_df = globals()["grouped_df"]
        result = clean_and_aggregate_data('data.csv')
        pd.testing.assert_frame_equal(result, expected_grouped_df)

    grouped_df = clean_and_aggregate_data('data.csv')
    plot_new_feature(grouped_df)
    test_clean_and_aggregate_data()
    </myrefactoredcode>
    """

    system_prompt = (
        "You are a powerful software developer assistant. "
        "Your task is to refactor a Jupyter notebook provided in text format. "
        "Important variables that need to be refactored will be highlighted. "
        "Follow the instructions below: "
        "1. The input notebook will be enclosed in <code></code> tags, and "
        "the cells and expressions to retain will be enclosed in <var></var> tags. "
        "2. Refactor the notebook code to be more concise, retaining the original cell structure as much as possible. "
        "3. Only include code necessary to generate the variables or statements specified in the <var></var> tags. "
        "4. Remove unnecessary parts of the code, being cautious of potential side effects and stateful operations. "
        "   Add a comment starting with `// (copilot[stateful])` above stateful statements that should not be removed. "
        "5. Your refactored code should be wrapped in <myrefactoredcode></myrefactoredcode> tags. "
        "6. Where possible, refactor the code into functions using Python syntax only. "
        "7. Ensure all relevant variables are returned from the functions. "
        "8. Provide a sample Python test case to verify the refactored code against the original. "
        "It is of high importance that this code will have test case. Don't forget. "
        "\nExamples: " + example1 + example2
    )
    return system_prompt


def constrct_raw_inst_user_prompt(code, vars_to_keep):
    system_prompt = get_system_prompt()
    content = f"<code>{code}</code><var>{vars_to_keep}</var>"
    return f"[INST]{system_prompt}[/INST][USER]{content}[/USER]"


def extract_python_code(text):
    """
    Take the content inside the <myrefactoredcode> tag out
<myrefactoredcode>
# %% [markdown]
# # Visualize a dataset
#
# Just want to visualize the dataset. Simple!

# %%
</myrefactoredcode>
    """
    re_pattern = r'<myrefactoredcode>(.*?)</myrefactoredcode>'
    match = re.search(re_pattern, text, re.DOTALL)
    if not match:
        raise ValueError(f"No code found in the text.: {text}")
    return match.group(1)


def example_prompt_for_testing():
    sys = get_system_prompt()
    user = """
<code lang="python">
# %% [markdown]
# # Visualize a dataset
#
# Just want to visualize the dataset. Simple!

# %%
# ! pip install ipynb-path

# %%
import pandas as pd

# %%
# Config the pandas dataframe to show in a specific format

pd.set_option('display.max_columns', 10)


# %% [markdown]
# Read the dataframe

# %%
df = pd.read_csv("data.csv")

# %%
df = df[df['a'] > 0]
df = df[df['b'] < 10]

# %%
df.describe()

# %%
df.head()

# %%
df2 = df[['b', 'a']]

# %%
df3 = df2.groupby('b').mean()

# %%
df3

# %%
df3.plot()

# %%
df3.plot(kind='bar')

# %%
from pathlib import Path
# TODO: Fix the path
__file__ = Path(".").absolute() / 'main.py'
__file__

# %%
# %load_ext refactor_extension
# %reload_ext refactor_extension
# %refactor_init $__file__
# %refactor --option  df3



# %%

# %%

</code>
<var>
df3, and the plots it generates
</var>
"""
    result = f"[INST]{sys}[/INST][USER]{user}[/USER]"
    return result


def invoke_llm(client, code: str, vars_to_kep: str) -> str:
    # TODO: (Refactor) Construct system prompt based on the user intent
    # TODO: (Refactor) Use DSPy or Guideline to construct the iterable prompt.
    system_prompt = get_system_prompt()

    content = f"<code>{code}</code><var>{vars_to_kep}</var>"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": content}
    ]
    print(messages)

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        max_tokens=2048,
        # max_tokens=64,  # testing
        temperature=0.3,
        # temperature=0,
        stream=False,
    )

    _output = (response.choices[0].message.content)

    # Ensure output only contains the output code
    output = extract_python_code(_output)

    return output


class DeepSeekLLM(LLM):
    def __init__(self, api_file=None):
        self.client = setup(api_file=api_file)

    def invoke_llm(self, code=None, code_path=None, vars_to_keep=None):
        assert code or code_path, "Either code or code_path must be provided."
        assert not (code and code_path), "Either code or code_path must be provided, not both."

        if code_path:
            with open(code_path) as file:
                code = file.read()

        return invoke_llm(self.client, code, vars_to_keep)


def parse_args(args_):
    parser = argparse.ArgumentParser(description='Deepseek Refactor Engine')
    parser.add_argument('--api-file', type=str, default=None)
    parser.add_argument('--code', type=str, default="",
                        help="Code to refactor (in string format). Only specify this if '--code-path' is not provided.")
    parser.add_argument('--code-path', type=str, default="",
                        help="Path to the code file to refactor. Only specify this if '--code' is not provided.")
    parser.add_argument('--vars-to-keep', type=str, default="")
    parser.add_argument('--output-path', type=str, default=None)
    return parser.parse_args(args_)


def main(args_=None):
    args = parse_args(args_)
    deepseek = DeepSeekLLM(api_file=args.api_file)
    output = deepseek.invoke_llm(code=args.code, code_path=args.code_path, vars_to_keep=args.vars_to_keep)
    print(output)
    if args.output_path:
        with open(args.output_path, 'w') as file:
            file.write(output)
    return


if __name__ == '__main__':
    main()
