import argparse
import os
from datetime import datetime
from pathlib import Path

from IPython import get_ipython
from IPython.core.magic import line_magic, line_cell_magic, magics_class, Magics

from llm.deepseek import DeepSeekLLM

debugprint = print


@magics_class
class RefactorMagics(Magics):
    def __init__(self, shell):
        super(RefactorMagics, self).__init__(shell)
        self.file_path = None  # Initialize with no file path
        self.llm = DeepSeekLLM()

    @line_magic
    def refactor_init(self, line):
        if not line.strip():
            print("Please provide the file path.")
            return
        self.file_path = line.strip()
        debugprint(f"Set current path to: {self.file_path}")

    @staticmethod
    def get_refactor_parser():
        parser = argparse.ArgumentParser()
        # parser.add_argument('--option', help='Specify an option for refactoring', default='default')
        parser.add_argument('--vars-to-keep', help='Specify the variables to keep', default='')
        return parser

    @line_cell_magic
    def refactor(self, line, cell=None):
        if not self.file_path:
            print("File path not set. Use %refactor_init <path_to_file> to set the file path first.")
            return

        parser = self.get_refactor_parser()
        try:
            args = parser.parse_args(line.split())
            print(f"Refactoring namespace: {args}")
        except SystemExit:
            # Handle errors in argparse or wrong inputs
            return

        ipython = get_ipython()
        globals = ipython.user_global_ns
        # Remove all global variables with _ in the name
        # TODO: High cost.
        filtered_out_globals = {key: value for key, value in globals.items() if '_' not in key}
        print("Current global variables:", filtered_out_globals.keys())
        self.refactor_script(self.file_path, args, filtered_out_globals)

    def refactor_script(self, path, args, global_vars):
        """
        Refactor the script at the given path based on the option provided.
        args: argparse.Namespace
            args.vars_to_keep: str
        """
        
        if path.endswith('.ipynb'):
            pypath = path.replace('.ipynb', '.py')
            jupyter_path = Path(path)
        elif path.endswith('.py'):
            pypath = path
            jupyter_path = Path(path.replace('.py', '.ipynb'))
        else:
            print(f"File format not supported: {path}")
            return
        
        # If jupyter path is found, then
        # convert it into a ipython script to process.
        
        with open(path, 'r') as file:
            code = file.read()

        # If the script is a ipynb file, convert it to an ipython script
        if path.endswith('.ipynb'):
            from nbconvert import PythonExporter
            import nbformat
            notebook = nbformat.read(path, as_version=4)
            exporter = PythonExporter()
            code, _ = exporter.from_notebook_node(notebook)

        debugprint(f"{code = }")
        api_result = self.get_llm_call(code, args, global_vars)
        debugprint(f"{api_result = }")
        code += api_result
        
        # Write to a separate file as arxiv
        now = datetime.now()
        now = now.strftime("%Y%m%d%H%M%S")
        arxiv_path = pypath.replace('.py', f'.arxiv_{now}.py')
        with open(arxiv_path, 'w+') as file:
            file.write(code)
        
        # with open(path, 'w') as file:
        #     file.write(code)

    def get_llm_call(self, code, args, global_vars) -> str:
        vars_to_keep = args.vars_to_keep
        debugprint(f"Calling LLM...")
        result = self.llm.invoke_llm(code=code, vars_to_keep=vars_to_keep)
        debugprint(f"LLM result: {result}")
        return result

    # def get_llm_call(self, cmds_to_refactor, args, global_vars):
    #     # TODO: some api call here
    #     api_result = ""
    #     # Example of conditional processing based on the option provided
    #     if args.option == 'add_hello':
    #         api_result += "\nprint('Hello from new cell!')"
    #     elif args.option == 'list_globals':
    #         api_result += "\nprint('Global variables:', list(globals().keys()))"
    #     else:
    #         api_result += f"\n# There are {len(global_vars)} global variables."
    #     return api_result


def load_ipython_extension(ipython):
    """Load the extension in IPython."""
    ipython.register_magics(RefactorMagics)


def unload_ipython_extension(ipython):
    """Unload the extension in IPython."""
    pass
