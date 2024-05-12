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
    example = (
        """Input: <code lang="python">
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
        df2 = df[['b', 'a']]
        
        # %%
        df3 = df2.groupby('b').mean()
        
        # %%
        df3
        
        # %%
        df3.plot()
        </code>
        <var>
        df3, and the plots it generates
        </var>
        
        Output:
        <myrefactoredcode>
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
        df3 = df2.groupby('b').mean()
        
        # %%
        df3
        
        # %%
        df3.plot()
        </myrefactoredcode>
        """
    )
    system_prompt = (
        "You are a powerful software developer assistant. "
        "Your job is to refactor a jupyter notebook given to you."
        "You will receive a jupyter notebook in text format, each cell "
        "separated by a line started with `# %%` or `#%%` or `In [n]:` (where n is a number, or blank). "
        "You will also receive the important variables that needed to be refactored. "  # variables to refactor
        "Task is described in detail as below: "
        "(*) The intput notebook will be wrapped by <code></code> tag, and "
        "the target variables and symbols will be wrapped by <var></var> tag, "
        "separated using comma. "
        "(*) Refactor the jupyter notebook to a more concise version. "
        "Keeping the original cell structure as much as possible. "
        "Only keep the necessary code to generate the variables or statements specified in <var></var> tag."
        "(*) Possibly prune other parts of the code that are not necessary. "
        "Be careful of potential side effects and stateful operations. "
        "You should add comment starting with `# (copilot[stateful])` on top of a stateful statement "
        "that you think is important to not remove. "
        "(*) Your generated code should start with <myrefactoredcode> and end with </myrefactoredcode> tag. "
        "Example: " + example
    )
    return system_prompt


def get_user_example() -> str:
    return """
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
df3 = df.groupby('b').mean()

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
    pass


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
