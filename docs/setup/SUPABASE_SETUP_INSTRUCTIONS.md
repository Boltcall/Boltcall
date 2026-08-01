# 🚀 Supabase Database Setup Instructions

## Quick Setup Steps

### 1. Access Your Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Select your project: **puszjwovldwgitfpsnfm**

### 2. Open SQL Editor
- Click on **"SQL Editor"** in the left sidebar
- Click **"New query"**

### 3. Execute the Database Schema
Copy and paste the **entire contents** of `DATABASE_SCHEMA.sql` into the SQL editor, then click **"Run"**.

### 4. What Will Be Created

#### 📊 Tables Created:
- ✅ `workspaces` - User workspaces
- ✅ `business_profiles` - Business information
- ✅ `voices` - Retell AI voice configurations
- ✅ `retell_llms` - Your AI LLM configurations

#### 🔧 Sample Data Included:
- ✅ **HVAC LLM**: Professional HVAC technician assistant
- ✅ **Law LLM**: Legal consultation assistant

#### 🔐 Security Features:
- ✅ Row Level Security (RLS) policies
- ✅ User-based access control
- ✅ Public/private LLM sharing

### 5. Verify Setup
After running the SQL, you should see:
- 4 new tables in the **Table Editor**
- 2 sample LLMs in the `retell_llms` table
- All RLS policies active

### 6. Test Your Setup
Your React app should now be able to:
- ✅ Connect to Supabase
- ✅ Manage LLM configurations
- ✅ Use the RetellLLMManager component

## 🎯 Next Steps
1. Run the SQL commands in Supabase
2. Test the connection in your app
3. Start creating custom LLMs!

---

**Need Help?** The `DATABASE_SCHEMA.sql` file contains all the necessary SQL commands with detailed comments.
