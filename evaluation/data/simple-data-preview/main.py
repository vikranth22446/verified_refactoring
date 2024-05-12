# %% [markdown]
# # Visualize a dataset

# %%
! pip install ipynb-path

# %%
import ipynb_path
__file__ = ipynb_path.get()

# %%
__file__

# %%
import pandas as pd

# %%
# Config the pandas dataframe to show in a specific format

pd.set_option('display.max_columns', 10)


# %% [markdown]
# Read the dataframe

# %%
df = pd.read_csv("data.csv")

# %%
df = df[df['a'] > 0]
df = df[df['b'] < 10]

# %%
df.describe()

# %%
df.head()

# %%
df2 = df[['b', 'a']]

# %%
df3 = df2.groupby('b').mean()

# %%
df3

# %%
df3.plot()

# %%
df3.plot(kind='bar')

# %%
%load_ext refactor_extension
%reload_ext refactor_extension
%refactor_init $__file__
%refactor --option 


