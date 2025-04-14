import tkinter as tk
from tkinter import scrolledtext, messagebox
import os
from together import Together

# ========== TOGETHER API KEY ==========
os.environ["TOGETHER_API_KEY"] = "f31a6aebd5aea09acfd50e489325a66bb442ee1169e39581672490f14cb90a57"  # <<< put your real API key here

client = Together()

# ========== Functions ==========

def restore_app():
    floating_button_window.destroy()
    root.deiconify()
    root.state('zoomed')

def show_floating_button():
    global floating_button_window

    floating_button_window = tk.Toplevel()
    floating_button_window.overrideredirect(True)
    floating_button_window.wm_attributes("-topmost", True)

    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()

    init_x = screen_width - 80
    init_y = screen_height // 2 - 30

    floating_button_window.geometry(f"60x60+{init_x}+{init_y}")

    button = tk.Button(floating_button_window, text="🧠", font=("Arial", 20), bg="white", command=restore_app, relief="raised", bd=2)
    button.pack(expand=True, fill="both")

    # Dragging
    def start_drag(event):
        floating_button_window.startX = event.x
        floating_button_window.startY = event.y

    def do_drag(event):
        x = floating_button_window.winfo_x() + event.x - floating_button_window.startX
        y = floating_button_window.winfo_y() + event.y - floating_button_window.startY
        floating_button_window.geometry(f"60x60+{x}+{y}")

    button.bind("<ButtonPress-1>", start_drag)
    button.bind("<B1-Motion>", do_drag)

def on_minimize(event):
    if root.state() == 'iconic':
        root.withdraw()
        show_floating_button()

def send_message(event=None):  # event=None allows Enter key binding
    user_input = entry.get()
    if not user_input.strip():
        messagebox.showwarning("Warning", "Please enter a question.")
        return

    chat_area.insert(tk.END, f"You: {user_input}\n")
    entry.delete(0, tk.END)
    chat_area.yview(tk.END)

    # Typing animation
    typing_tag = chat_area.index(tk.END)
    chat_area.insert(tk.END, "Together AI: Typing...\n")
    chat_area.yview(tk.END)

    root.update()  # refresh the GUI so user can see "Typing..."

    try:
        # Sending to Together AI
        response = client.chat.completions.create(
            model="meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
            messages=[
                {"role": "user", "content": user_input}
            ]
        )

        bot_response = response.choices[0].message.content.strip()

        # Remove "Typing..." and replace with actual response
        chat_area.delete(typing_tag, tk.END)
        chat_area.insert(tk.END, f"Together AI: {bot_response}\n\n")
        chat_area.yview(tk.END)

    except Exception as e:
        chat_area.delete(typing_tag, tk.END)
        chat_area.insert(tk.END, f"Error: {str(e)}\n")
        chat_area.yview(tk.END)

    # Automatically focus the entry field for the next message
    entry.focus_set()

# ========== Main Window ==========

root = tk.Tk()
root.geometry("600x700")
root.title("🧠 AI Chat Assistant (Together AI)")
root.configure(bg="#f0f2f5")
root.bind("<Unmap>", on_minimize)

# Title Label
title_label = tk.Label(root, text="Chat with Together AI", font=("Helvetica", 24, "bold"), bg="#f0f2f5", fg="#333")
title_label.pack(pady=20)

# Chat Area
chat_area = scrolledtext.ScrolledText(root, wrap=tk.WORD, font=("Arial", 12), bg="white", fg="black", bd=2, relief="groove")
chat_area.pack(padx=20, pady=10, fill=tk.BOTH, expand=True)

# Input Frame
input_frame = tk.Frame(root, bg="#f0f2f5")
input_frame.pack(fill=tk.X, padx=20, pady=10)

entry = tk.Entry(input_frame, font=("Arial", 14), bg="white", fg="black")
entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0,10))
entry.bind("<Return>", send_message)   # <<< Press Enter to send message

send_button = tk.Button(input_frame, text="Send", font=("Arial", 12, "bold"), bg="#4CAF50", fg="white", relief="raised", bd=2, command=send_message)
send_button.pack(side=tk.RIGHT)

root.mainloop()
