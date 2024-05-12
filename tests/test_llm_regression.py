import re

from llm.deepseek import extract_python_code


def test_extract_python_code():
    text = """
        <myrefactoredcode>
    # %% [markdown]
    # # Visualize a dataset
    #
    # Just want to visualize the dataset. Simple!
    </myrefactoredcode>
    
    """

    print(extract_python_code(text))
    # assert ...
    pass
