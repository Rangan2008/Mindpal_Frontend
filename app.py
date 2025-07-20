from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
import google.generativeai as genai
import sqlite3
from datetime import datetime
import os

# Load environment variables
load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.environ.get('api_key'))
model = genai.GenerativeModel("models/gemini-2.5-pro")

# Flask app setup
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "fallback-secret")
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Database and password encryption
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# ------------------ MODELS ------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

class EmergencyContact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer)  # Assuming users are logged in
    phone_number = db.Column(db.String(20), nullable=False)


# ------------------ ROUTES ------------------
@app.route('/')
def home():
    return render_template('index.html', username=session.get('username'))

@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        form_type = request.form.get('form_type')

        if form_type == 'login':
            email = request.form.get('email')
            password = request.form.get('password')
            user = User.query.filter_by(email=email).first()

            if user and bcrypt.check_password_hash(user.password, password):
                session['username'] = user.username
                flash(f"Welcome back, {user.username}!", "success")
                return redirect(url_for('home'))
            else:
                flash("Invalid email or password", "error")
                return redirect(url_for('auth'))

        elif form_type == 'signup':
            username = request.form.get('username')
            email = request.form.get('email')
            password = request.form.get('password')
            confirm = request.form.get('confirm')

            if password != confirm:
                flash("Passwords do not match", "error")
                return redirect(url_for('auth'))

            if User.query.filter_by(email=email).first():
                flash("Email already registered", "error")
                return redirect(url_for('auth'))

            hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
            new_user = User(username=username, email=email, password=hashed_pw)
            db.session.add(new_user)
            db.session.commit()
            flash("Signup successful! Please login.", "success")
            return redirect(url_for('auth'))

    return render_template('registration.html', username=session.get('username'))

@app.route('/logout')
def logout():
    session.pop('username', None)
    flash("You have been logged out.", "success")
    return redirect(url_for('home'))

@app.route('/profile')
def profile():
    if 'username' not in session:
        flash("Please login to access your profile.", "error")
        return redirect(url_for('auth'))
    return render_template('profile.html', username=session.get('username'))

# ------------------ CHATBOT ROUTE ------------------
@app.route('/chatbot', methods=['POST'])
def chatbot():
    if 'username' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_input = request.json.get("message", "")
    username = session['username']

    # Generate response using Gemini
    try:
        response = model.generate_content(
            f"You are a supportive assistant. Student says: {user_input}"
        )
        bot_reply = response.text
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Save user message and bot reply to DB
    conn = sqlite3.connect('instance/chatbot.db')
    cursor = conn.cursor()
    cursor.execute("INSERT INTO chats (username, message) VALUES (?, ?)", (username, f"You: {user_input}"))
    cursor.execute("INSERT INTO chats (username, message) VALUES (?, ?)", (username, f"Bot: {bot_reply}"))
    conn.commit()
    conn.close()

    return jsonify({"response": bot_reply})

# ------------------ CHAT HISTORY ROUTE ------------------
@app.route('/get_chats', methods=['GET'])
def get_chats():
    if 'username' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    username = session['username']
    conn = sqlite3.connect('instance/chatbot.db')
    cursor = conn.cursor()
    cursor.execute("SELECT message, timestamp FROM chats WHERE username = ? ORDER BY timestamp ASC", (username,))
    rows = cursor.fetchall()
    conn.close()

    chats = [{"message": row[0], "timestamp": row[1]} for row in rows]
    return jsonify({"chats": chats})

# ------------------ ADMIN VIEW ROUTE ------------------
@app.route('/admin/logins')
def admin_logins():
    if 'username' not in session or session['username'] != 'admin':
        flash("Admin access only", "error")
        return redirect(url_for('home'))

    users = User.query.all()
    return render_template('admin_logins.html', users=users, username=session.get('username'))

# ------------------ ADDITIONAL PAGES ------------------
@app.route('/wellbeing')
def wellbeing():
    return render_template('wellbeing.html', username=session.get('username'))

@app.route('/studytips')
def studytips():
    return render_template('studytips.html', username=session.get('username'))

@app.route('/music')
def music():
    return render_template('music.html', username=session.get('username'))

@app.route('/academic')
def academic():
    return render_template('Academic.html', username=session.get('username'))

@app.route('/financial')
def financial():
    return render_template('Financial.html', username=session.get('username'))

@app.route('/career')
def career():
    return render_template('career.html', username=session.get('username'))

@app.route('/time')
def time():
    return render_template('time.html', username=session.get('username'))

@app.route('/pmh')
def pmh():
    return render_template('pmh.html', username=session.get('username'))

@app.route('/chat')
def chat_page():
    return render_template('chatbot.html', username=session.get('username'))

@app.route('/emergency')
def emergency_page():
    return render_template('emergency.html', username=session.get('username'))

def create_chat_table():
    conn = sqlite3.connect('instance/chatbot.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

from flask import render_template, request, redirect, url_for, session, flash
from twilio.rest import Client

@app.route('/emergency', methods=['GET', 'POST'])
def emergency():
    if 'username' not in session:
        flash('Please log in to access emergency features.', 'danger')
        return redirect(url_for('auth'))

    username = session['username']
    user = User.query.filter_by(username=username).first()

    if not user:
        flash("User not found.", "danger")
        return redirect(url_for('auth'))

    user_id = user.id

    # Save a new number
    if request.method == 'POST' and 'save_number' in request.form:
        new_number = request.form['new_number']
        if new_number:
            contact = EmergencyContact(user_id=user_id, phone_number=new_number)
            db.session.add(contact)
            db.session.commit()
            flash('Emergency contact saved!', 'success')

    # Send emergency message
    if request.method == 'POST' and 'send_alert' in request.form:
        contacts = EmergencyContact.query.filter_by(user_id=user_id).all()

        account_sid = os.environ.get('account_sid')
        auth_token = os.environ.get('auth_token')
        from_number = os.environ.get('from_number')
        client = Client(account_sid, auth_token)

        for contact in contacts:
            try:
                client.messages.create(
                    body="🚨 Emergency Alert: Please check on your child immediately! From MindPal.",
                    from_=from_number,
                    to=contact.phone_number
                )
            except Exception as e:
                flash(f"Failed to send SMS to {contact.phone_number}: {str(e)}", 'danger')
        flash('Emergency alerts sent to all saved contacts!', 'success')

    # Get stored contacts
    contacts = EmergencyContact.query.filter_by(user_id=user_id).all()

    return render_template('emergency.html', contacts=contacts)


# ------------------ MAIN ------------------
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        create_chat_table()  # ← Create chatbot chat table if not exists
    app.run(debug=True)
