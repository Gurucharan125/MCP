import sys
from .config import CONFIG
from .agent import run_agent
from .tools import load_dynamic_tools

def ask(chat_history):
    try:
        while True:
            try:
                user_input = input("You: ").strip()
            except EOFError:
                break
                
            if not user_input:
                continue
                
            if user_input.lower() == "exit":
                sys.exit(0)
                
            try:
                run_agent(user_input, chat_history, True)
            except Exception as e:
                print(f"Error in interactive loop: {e}")
    except KeyboardInterrupt:
        print("\nExiting...")
        sys.exit(0)

def main():
    load_dynamic_tools()
    chat_history = [{"role": "system", "content": CONFIG.SYSTEM_PROMPT}]
    
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        run_agent(query, chat_history, False)
    else:
        print("Mistral Autonomous Tool Assistant started. Type 'exit' to quit.")
        ask(chat_history)

if __name__ == "__main__":
    main()
