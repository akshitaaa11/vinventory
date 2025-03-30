from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField, TextAreaField, IntegerField, DateField
from wtforms.validators import DataRequired, Email, EqualTo, Length, ValidationError, Optional
from models import User


class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')


class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=64)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    role = SelectField('Role', choices=[('student', 'Student'), ('incharge', 'Lab In-Charge')])
    submit = SubmitField('Register')

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('Username already taken. Please choose a different one.')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('Email already registered. Please use a different one.')


class EquipmentForm(FlaskForm):
    name = StringField('Equipment Name', validators=[DataRequired(), Length(max=100)])
    description = TextAreaField('Description', validators=[Optional()])
    serial_number = StringField('Serial Number', validators=[Optional(), Length(max=100)])
    quantity = IntegerField('Quantity', validators=[DataRequired()])
    status = SelectField('Status', choices=[
        ('Available', 'Available'),
        ('In Use', 'In Use'),
        ('Maintenance', 'Under Maintenance'),
        ('Damaged', 'Damaged'),
        ('On Order', 'On Order')
    ])
    lab_id = SelectField('Laboratory', coerce=int, validators=[DataRequired()])
    purchase_date = DateField('Purchase Date', validators=[Optional()], format='%Y-%m-%d')
    last_maintenance = DateField('Last Maintenance', validators=[Optional()], format='%Y-%m-%d')
    submit = SubmitField('Submit')


class SearchForm(FlaskForm):
    search_query = StringField('Search', validators=[DataRequired()])
    submit = SubmitField('Search')


class LaboratoryForm(FlaskForm):
    name = StringField('Laboratory Name', validators=[DataRequired(), Length(max=100)])
    description = TextAreaField('Description', validators=[Optional()])
    location = StringField('Location', validators=[Optional(), Length(max=100)])
    submit = SubmitField('Submit')
