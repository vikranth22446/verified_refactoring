import argparse
from IPython.core.magic import line_magic, line_cell_magic, magics_class, Magics
from IPython import get_ipython

@magics_class
class RefactorMagics(Magics):
    def __init__(self, shell):
        super(RefactorMagics, self).__init__(shell)
        self.file_path = None  # Initialize with no file path

    @line_magic
    def refactor_init(self, line):
        if not line.strip():
            print("Please provide the file path.")
            return
        self.file_path = line.strip()

    @line_cell_magic
    def refactor(self, line, cell=None):
        if not self.file_path:
            print("File path not set. Use %refactor_init <path_to_file> to set the file path first.")
            return

        parser = argparse.ArgumentParser()
        parser.add_argument('--option', help='Specify an option for refactoring', default='default')
        try:
            args = parser.parse_args(line.split())
            print(f"Refactoring with option: {args.option}")
        except SystemExit:
            # Handle errors in argparse or wrong inputs
            return

        ipython = get_ipython()
        globals = ipython.user_global_ns
        # Remove all global variables with _ in the name
        filtered_out_globals = {key: value for key, value in globals.items() if '_' not in key}
        print("Current global variables:", filtered_out_globals.keys())
        self.refactor_script(self.file_path, args, filtered_out_globals)

    def refactor_script(self, path, args, global_vars):
        with open(path, 'r') as file:
            script_content = file.read()

        # Split the file based on # commands
        commands = script_content.split('#%%')
        refactor_commands = []

        # # Get the commands that have the line #tag:refactor
        # for command in commands:
        #     if 'tag:refactor' in command:
        #         refactor_commands.append(command)

        # Join the refactor commands back together
        if refactor_commands:
            # only refactor a subset of them
            script_content_to_refactor = '#'.join(refactor_commands[:2])
        else:
            script_content_to_refactor = script_content

        api_result = self.get_llm_call(script_content_to_refactor, args, global_vars)
        script_content += api_result
        with open(path, 'w') as file:
            file.write(script_content)

    def get_llm_call(self, cmds_to_refactor, args, global_vars):
        # TODO: some api call here
        api_result = ""
        # Example of conditional processing based on the option provided
        if args.option == 'add_hello':
            api_result += "\nprint('Hello from new cell!')"
        elif args.option == 'list_globals':
            api_result += "\nprint('Global variables:', list(globals().keys()))"
        else:
            api_result += f"\n# There are {len(global_vars)} global variables."
        return api_result
    
def load_ipython_extension(ipython):
    """Load the extension in IPython."""
    ipython.register_magics(RefactorMagics)

def unload_ipython_extension(ipython):
    """Unload the extension in IPython."""
    pass
