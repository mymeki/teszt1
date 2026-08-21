/*
# Make Sándor the General Manager

1. Changes
- Update Sándor's role from 'manager' to 'general_manager'
- Remove the placeholder 'Főmenedzser' manager entry
- Sándor will now see the admin dashboard when logging in
- Sándor does not submit shift requests; he only creates the planning
*/

UPDATE managers SET role = 'general_manager', sort_order = 99 WHERE name = 'Sándor';
DELETE FROM managers WHERE name = 'Főmenedzser';
