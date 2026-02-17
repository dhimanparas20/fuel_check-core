# Fuel Check Core

Fuel Check Core is a Django-based web application that allows users to store and manage their vehicles' fuel filling records, track mileage, and monitor various vehicle-related details. This project is designed to help users keep a digital log of their vehicle's fuel consumption, service history, and other important information for better maintenance and efficiency tracking.

## Features

- User authentication and management
- Add and manage multiple vehicles
- Record fuel filling transactions for each vehicle
- Track mileage, fuel consumption, and service dates
- Store and view vehicle details (registration, model, color, company, etc.)
- Admin interface for managing users, vehicles, and transactions
- Search, filter, and sort records in the admin panel

## Tech Stack

- Python 3.x
- Django 6.x
- Django REST Framework
- MySQL (default, can be switched to SQLite)

## Getting Started

### Prerequisites
- Python 3.x
- pip
- MySQL (or SQLite for development)
- (Optional) Docker for containerized setup

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd fuel_check-core
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure your database in `project/settings.py` (MySQL or SQLite).
4. Run migrations:
   ```bash
   python manage.py migrate
   ```
5. Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```
6. Start the development server:
   ```bash
   python manage.py runserver
   ```

### API Endpoints

- The project uses Django REST Framework for API endpoints (see `serializers.py`).
- You can extend the project with views and routers for RESTful APIs.

### Admin Panel
- Access the admin panel at `/admin/` to manage users, vehicles, and transactions.

## Project Structure

- `fuel_check/` - Main app containing models, serializers, admin, and business logic
- `project/` - Django project configuration
- `manage.py` - Django management script

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements or bug fixes.

## License

This project is licensed under the MIT License.

## Author

- Your Name

---

Feel free to customize this README for your specific needs and add more details as your project evolves.

