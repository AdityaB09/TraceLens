# From a working directory, not inside the repo yet
git clone https://github.com/dotnet-architecture/eShopOnWeb.git
cd .\eShopOnWeb\

# Create a list of source files
$files = Get-ChildItem -Recurse -File -Include *.cs,*.csproj

# Zip just those (preserves folder structure)
Compress-Archive -Path $files.FullName -DestinationPath ..\eshop_src_only.zip -Force

# Go back next to the zip
cd ..
