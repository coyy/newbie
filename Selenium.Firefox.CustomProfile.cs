string profileLocal = @"C:\test1";
int portWebdriver = new Random().Next(20000, 30000);
List<string> newProfile = new List<string>();
newProfile.Add("user_pref(\"marionette.contentListener\", true);");
newProfile.Add("user_pref(\"marionette.enabled\", true);");
newProfile.Add("user_pref(\"marionette.port\", " + portWebdriver + ");");
File.WriteAllLines(profileLocal + "\\prefs.js", newProfile);
FirefoxDriverService firefoxService = FirefoxDriverService.CreateDefaultService();
FirefoxOptions optionsFirefox = new FirefoxOptions();
firefoxService.HideCommandPromptWindow = true;
firefoxService.BrowserCommunicationPort = portWebdriver;
optionsFirefox.AddArgument("-profile");
optionsFirefox.AddArgument(profileLocal);
var webDriver = new FirefoxDriver(firefoxService, optionsFirefox);
