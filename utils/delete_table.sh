#!/bin/bash

# PostgreSQL connection string
CONN_STR="postgresql://doadmin:AVNS_9ciA2EwlCy69JD55IPL@db-ad3ed706-f1b7-4db7-87de-b5a-do-user-13257295-0.a.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

# Delete the table using psql
psql "$CONN_STR" -f delete.sql
