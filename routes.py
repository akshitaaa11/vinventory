import logging
from datetime import datetime
from flask import render_template, url_for, flash, redirect, request, jsonify
from flask_login import login_user, current_user, logout_user, login_required
from app import app, db
from models import User, Laboratory, Equipment
from forms import LoginForm, RegistrationForm, EquipmentForm, SearchForm, LaboratoryForm
from sqlalchemy import or_


# Configure logging
logger = logging.getLogger(__name__)


# Add context processor to provide current date information to all templates
@app.context_processor
def inject_now():
    return {'now': datetime.utcnow()}


@app.route('/')
@app.route('/home')
def home():
    return render_template('index.html', title='Home')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        if current_user.role == 'student':
            return redirect(url_for('student_dashboard'))
        else:
            return redirect(url_for('incharge_dashboard'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data):
            login_user(user)
            next_page = request.args.get('next')
            flash(f'Welcome back, {user.username}!', 'success')
            
            if user.role == 'student':
                return redirect(next_page) if next_page else redirect(url_for('student_dashboard'))
            else:
                return redirect(next_page) if next_page else redirect(url_for('incharge_dashboard'))
        else:
            flash('Login failed. Please check your username and password.', 'danger')
    
    return render_template('login.html', title='Login', form=form)


@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            email=form.email.data,
            role=form.role.data
        )
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        
        flash(f'Account created successfully! You can now log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html', title='Register', form=form)


@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('home'))


@app.route('/student/dashboard')
@login_required
def student_dashboard():
    if current_user.role != 'student':
        flash('Access denied. Students only.', 'warning')
        return redirect(url_for('home'))
    
    laboratories = Laboratory.query.all()
    search_form = SearchForm()
    return render_template('student/dashboard.html', title='Student Dashboard', 
                           laboratories=laboratories, search_form=search_form)


@app.route('/student/equipment/<int:lab_id>')
@login_required
def student_equipment(lab_id):
    if current_user.role != 'student':
        flash('Access denied. Students only.', 'warning')
        return redirect(url_for('home'))
    
    laboratory = Laboratory.query.get_or_404(lab_id)
    equipment_list = Equipment.query.filter_by(lab_id=lab_id).all()
    laboratories = Laboratory.query.all()
    search_form = SearchForm()
    
    return render_template('student/equipment.html', title=f'{laboratory.name} Equipment',
                          laboratory=laboratory, equipment_list=equipment_list,
                          laboratories=laboratories, search_form=search_form)


@app.route('/search', methods=['GET', 'POST'])
@login_required
def search():
    search_form = SearchForm()
    laboratories = Laboratory.query.all()
    
    if search_form.validate_on_submit() or request.args.get('query'):
        query = search_form.search_query.data if search_form.validate_on_submit() else request.args.get('query')
        
        equipment_results = Equipment.query.filter(
            or_(
                Equipment.name.ilike(f'%{query}%'),
                Equipment.description.ilike(f'%{query}%'),
                Equipment.serial_number.ilike(f'%{query}%')
            )
        ).all()
        
        if current_user.role == 'student':
            return render_template('student/equipment.html', title='Search Results',
                                  equipment_list=equipment_results, search_query=query,
                                  laboratories=laboratories, search_form=search_form)
        else:
            return render_template('incharge/manage_inventory.html', title='Search Results',
                                  equipment_list=equipment_results, search_query=query,
                                  laboratories=laboratories, search_form=search_form)
    
    if current_user.role == 'student':
        return redirect(url_for('student_dashboard'))
    else:
        return redirect(url_for('incharge_dashboard'))


@app.route('/incharge/dashboard')
@login_required
def incharge_dashboard():
    if current_user.role != 'incharge':
        flash('Access denied. Lab in-charge only.', 'warning')
        return redirect(url_for('home'))
    
    laboratories = Laboratory.query.all()
    equipment_count = Equipment.query.count()
    available_count = Equipment.query.filter_by(status='Available').count()
    maintenance_count = Equipment.query.filter_by(status='Maintenance').count()
    search_form = SearchForm()
    
    return render_template('incharge/dashboard.html', title='Lab In-Charge Dashboard',
                          laboratories=laboratories, equipment_count=equipment_count,
                          available_count=available_count, maintenance_count=maintenance_count,
                          search_form=search_form)


@app.route('/incharge/manage_inventory')
@login_required
def manage_inventory():
    if current_user.role != 'incharge':
        flash('Access denied. Lab in-charge only.', 'warning')
        return redirect(url_for('home'))
    
    lab_id = request.args.get('lab_id', type=int)
    search_form = SearchForm()
    laboratories = Laboratory.query.all()
    
    if lab_id:
        laboratory = Laboratory.query.get_or_404(lab_id)
        equipment_list = Equipment.query.filter_by(lab_id=lab_id).all()
    else:
        laboratory = None
        equipment_list = Equipment.query.all()
    
    return render_template('incharge/manage_inventory.html', title='Manage Inventory',
                          laboratory=laboratory, equipment_list=equipment_list,
                          laboratories=laboratories, search_form=search_form)


@app.route('/incharge/add_equipment', methods=['GET', 'POST'])
@login_required
def add_equipment():
    if current_user.role != 'incharge':
        flash('Access denied. Lab in-charge only.', 'warning')
        return redirect(url_for('home'))
    
    form = EquipmentForm()
    form.lab_id.choices = [(lab.id, lab.name) for lab in Laboratory.query.all()]
    
    if form.validate_on_submit():
        equipment = Equipment(
            name=form.name.data,
            description=form.description.data,
            serial_number=form.serial_number.data,
            quantity=form.quantity.data,
            status=form.status.data,
            lab_id=form.lab_id.data,
            purchase_date=form.purchase_date.data,
            last_maintenance=form.last_maintenance.data
        )
        db.session.add(equipment)
        db.session.commit()
        
        flash(f'Equipment "{equipment.name}" has been added successfully!', 'success')
        return redirect(url_for('manage_inventory', lab_id=equipment.lab_id))
    
    laboratories = Laboratory.query.all()
    search_form = SearchForm()
    return render_template('incharge/add_equipment.html', title='Add Equipment',
                          form=form, laboratories=laboratories, search_form=search_form)


@app.route('/incharge/edit_equipment/<int:equipment_id>', methods=['GET', 'POST'])
@login_required
def edit_equipment(equipment_id):
    if current_user.role != 'incharge':
        flash('Access denied. Lab in-charge only.', 'warning')
        return redirect(url_for('home'))
    
    equipment = Equipment.query.get_or_404(equipment_id)
    form = EquipmentForm()
    form.lab_id.choices = [(lab.id, lab.name) for lab in Laboratory.query.all()]
    
    if form.validate_on_submit():
        equipment.name = form.name.data
        equipment.description = form.description.data
        equipment.serial_number = form.serial_number.data
        equipment.quantity = form.quantity.data
        equipment.status = form.status.data
        equipment.lab_id = form.lab_id.data
        equipment.purchase_date = form.purchase_date.data
        equipment.last_maintenance = form.last_maintenance.data
        equipment.updated_at = datetime.utcnow()
        
        db.session.commit()
        flash(f'Equipment "{equipment.name}" has been updated successfully!', 'success')
        return redirect(url_for('manage_inventory', lab_id=equipment.lab_id))
    
    elif request.method == 'GET':
        form.name.data = equipment.name
        form.description.data = equipment.description
        form.serial_number.data = equipment.serial_number
        form.quantity.data = equipment.quantity
        form.status.data = equipment.status
        form.lab_id.data = equipment.lab_id
        form.purchase_date.data = equipment.purchase_date
        form.last_maintenance.data = equipment.last_maintenance
    
    laboratories = Laboratory.query.all()
    search_form = SearchForm()
    return render_template('incharge/add_equipment.html', title='Edit Equipment',
                         form=form, equipment=equipment, laboratories=laboratories, search_form=search_form)


@app.route('/incharge/delete_equipment/<int:equipment_id>', methods=['POST'])
@login_required
def delete_equipment(equipment_id):
    if current_user.role != 'incharge':
        flash('Access denied. Lab in-charge only.', 'warning')
        return redirect(url_for('home'))
    
    equipment = Equipment.query.get_or_404(equipment_id)
    lab_id = equipment.lab_id
    db.session.delete(equipment)
    db.session.commit()
    flash(f'Equipment "{equipment.name}" has been deleted.', 'success')
    
    return redirect(url_for('manage_inventory', lab_id=lab_id))


@app.errorhandler(404)
def page_not_found(e):
    return render_template('error.html', title='Page Not Found', error=str(e)), 404


@app.errorhandler(500)
def internal_server_error(e):
    return render_template('error.html', title='Internal Server Error', error=str(e)), 500
