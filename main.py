import tkinter as tk

def restore_app():
    floating_button_window.destroy()  # Close floating button
    root.deiconify()  # Show main window again
    root.state('zoomed')  # Maximize app window

def show_floating_button():
    global floating_button_window, screen_width, screen_height

    floating_button_window = tk.Toplevel()
    floating_button_window.overrideredirect(True)  # No title bar
    floating_button_window.wm_attributes("-topmost", True)

    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()

    init_x = screen_width - 80
    init_y = screen_height // 2 - 30

    floating_button_window.geometry(f"60x60+{init_x}+{init_y}")

    button = tk.Button(floating_button_window, text="🧠", font=("Arial", 20), bg="white", command=restore_app)
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
    if root.state() == 'iconic':  # Check if window is minimized
        root.withdraw()  # Hide the window
        show_floating_button()

root = tk.Tk()
root.geometry("800x600")
root.title("Floating Button App")

# Bind the <Unmap> event to detect minimize
root.bind("<Unmap>", on_minimize)

# Main App Content
label = tk.Label(root, text="Main App Window", font=("Arial", 24))
label.pack(pady=100)

root.mainloop()
