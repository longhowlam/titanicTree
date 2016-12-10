

library(titanic)
library(MicrosoftML)
library(RevoTreeView)

titanic     = titanic::titanic_train
titanic$Sex = as.factor(titanic$Sex)
titantree   = rxDTree(Survived ~ Sex + Age + Fare, data = titanic)
plot(createTreeView(titantree))


zipTreeView(createTreeView(titantree), 'TitanicTree.zip', flags="a", zip="C:/Program Files/7-zip/7z.exe")

