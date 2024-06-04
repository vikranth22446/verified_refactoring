import argparse
import re
from os import PathLike
from pathlib import Path

from flask import Flask, request, jsonify
from openai import OpenAI
from llm.deepseek import DeepSeekLLM
from flask import Flask, request, jsonify, Response
import json

app = Flask(__name__)

@app.route('/refactor', methods=['POST'])
def refactor_code():
    data = request.json
    code = data.get('code')
    vars_to_keep = data.get('vars') # or "vars_to_keep"?
    if not vars_to_keep:
        vars_to_keep = '<auto />'
    print(f"{vars_to_keep = }")
    api_file = data.get('api_file', None)
    # vars_to_keep = "<empty>"
    if not code or not vars_to_keep:
        return jsonify({"error": "code and vars_to_keep are required"}), 400
    
    print(f"code: {code}")
    print(f"vars_to_keep: {vars_to_keep}")

    deepseek = DeepSeekLLM(api_file=api_file)
    try:
        output = deepseek.invoke_llm(code=code, vars_to_keep=vars_to_keep)
        return jsonify({"refactored_code": output})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/refactor_v2', methods=['POST'])
def refactor_code_v2():
    data = request.json
    code = data.get('code')
    vars_to_keep = data.get('vars')  # or "vars_to_keep"?
    if not vars_to_keep:
        vars_to_keep = '<auto />'
    api_file = data.get('api_file', None)
    if not code or not vars_to_keep:
        return jsonify({"error": "code and vars_to_keep are required"}), 400

    deepseek = DeepSeekLLM(api_file=api_file)
    try:
        return Response(stream_refactor_code(deepseek, code, vars_to_keep), content_type='application/json')
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def stream_refactor_code(deepseek, code, vars_to_keep):
    for output in deepseek.invoke_llm_stream(code=code, vars_to_keep=vars_to_keep):
        yield output.replace("<myrefactoredcode>", "").replace("</myrefactoredcode>", "") + '\n'

@app.route("/", methods=['GET'])
def home():
    return "call /refactor"

if __name__ == '__main__':
    app.run(debug=True)